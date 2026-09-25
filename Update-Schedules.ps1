[CmdletBinding()]
param(
    # Defaults to schedule-data.json in the same directory as this script,
    # i.e. the app's project root, matching the `import scheduleData from
    # '../schedule-data.json'` in src/ScheduleApp.tsx.
    [string]$OutputPath = (Join-Path $PSScriptRoot 'schedule-data.json'),
    [string]$ActivityListUrl = 'https://starcenter.finnlyconnect.com/Registration/ActivityList',
    [int]$TimeoutSec = 30,
    [int]$CacheTtlHours = 24,
    [switch]$ForceRefresh,
    # Also writes the full, unslimmed scrape (activity catalog, match
    # diagnostics, per-session signup candidates) to cache\schedule-data.full.json
    # for debugging. The app never reads it.
    [switch]$WriteFullData
)

$ErrorActionPreference = 'Stop'

$schedulePages = [ordered]@{
    'Euless' = 'https://starcenter.finnlyconnect.com/schedule/868'
    'Farmers Branch' = 'https://starcenter.finnlyconnect.com/schedule/961'
    'Frisco' = 'https://starcenter.finnlyconnect.com/schedule/962'
    'Mansfield' = 'https://starcenter.finnlyconnect.com/schedule/963'
    'McKinney' = 'https://starcenter.finnlyconnect.com/schedule/964'
    'Northlake' = 'https://starcenter.finnlyconnect.com/schedule/965'
    'Plano' = 'https://starcenter.finnlyconnect.com/schedule/966'
    'Richardson' = 'https://starcenter.finnlyconnect.com/schedule/967'
}

# centerId / siteId start out $null and are filled in from each schedule
# page's own facilityList during the fetch pass below — they are NOT
# hardcoded because we don't know them ahead of a scrape, and the site could
# renumber them; the script always derives them fresh from live/cached data.
$locations = @(
    [ordered]@{ name = 'Euless'; address = '1400 South Pipeline Road'; city = 'Euless'; state = 'TX'; postalCode = '76040'; phone = '817-267-4233'; officialUrl = 'https://www.nhl.com/stars/starcenters/locations/euless'; scheduleUrl = $schedulePages.Euless; centerId = $null; siteId = $null },
    [ordered]@{ name = 'Farmers Branch'; address = '12700 N Stemmons Fwy'; city = 'Farmers Branch'; state = 'TX'; postalCode = '75234'; phone = '214-432-3131'; officialUrl = 'https://www.nhl.com/stars/starcenters/locations/farmers-branch'; scheduleUrl = $schedulePages.'Farmers Branch'; centerId = $null; siteId = $null },
    [ordered]@{ name = 'Frisco'; address = '2601 Avenue of the Stars'; city = 'Frisco'; state = 'TX'; postalCode = '75034'; phone = '214-387-5655'; officialUrl = 'https://www.nhl.com/stars/starcenters/locations/frisco'; scheduleUrl = $schedulePages.Frisco; centerId = $null; siteId = $null },
    [ordered]@{ name = 'Mansfield'; address = '1715 E. Broad Street'; city = 'Mansfield'; state = 'TX'; postalCode = '76063'; phone = '830-510-3140'; officialUrl = 'https://www.nhl.com/stars/starcenters/locations/mansfield'; scheduleUrl = $schedulePages.Mansfield; centerId = $null; siteId = $null },
    [ordered]@{ name = 'McKinney'; address = '6993 Stars Avenue'; city = 'McKinney'; state = 'TX'; postalCode = '75070'; phone = '469-675-8325'; officialUrl = 'https://www.nhl.com/stars/starcenters/locations/mckinney'; scheduleUrl = $schedulePages.McKinney; centerId = $null; siteId = $null },
    [ordered]@{ name = 'Northlake'; address = '13850 Chadwick Pkwy'; city = 'Northlake'; state = 'TX'; postalCode = '76262'; phone = $null; officialUrl = 'https://www.nhl.com/stars/starcenters/locations/northlake'; scheduleUrl = $schedulePages.Northlake; centerId = $null; siteId = $null },
    [ordered]@{ name = 'Plano'; address = '4020 West Plano Parkway'; city = 'Plano'; state = 'TX'; postalCode = '75093'; phone = '214-975-7400'; officialUrl = 'https://www.nhl.com/stars/starcenters/locations/plano'; scheduleUrl = $schedulePages.Plano; centerId = $null; siteId = $null },
    [ordered]@{ name = 'Richardson'; address = '522 Centennial Blvd.'; city = 'Richardson'; state = 'TX'; postalCode = '75081'; phone = '972-680-7825'; officialUrl = 'https://www.nhl.com/stars/starcenters/locations/richardson'; scheduleUrl = $schedulePages.Richardson; centerId = $null; siteId = $null }
)

function Get-BalancedJsonValue {
    param([string]$Text, [string]$VariableName)
    $assignmentPattern = "(?m)(?:let|var|const)?\s*" + [regex]::Escape($VariableName) + '\s*=\s*'
    $assignment = [regex]::Match($Text, $assignmentPattern)
    if (-not $assignment.Success) { return $null }
    $start = $assignment.Index + $assignment.Length
    while ($start -lt $Text.Length -and [char]::IsWhiteSpace($Text[$start])) { $start++ }
    if ($start -ge $Text.Length -or ($Text[$start] -ne '[' -and $Text[$start] -ne '{')) { throw "Invalid JSON assignment: $VariableName" }
    $opening = $Text[$start]
    $closing = if ($opening -eq '[') { ']' } else { '}' }
    $depth = 0; $insideString = $false; $escaped = $false
    for ($i = $start; $i -lt $Text.Length; $i++) {
        $ch = $Text[$i]
        if ($insideString) {
            if ($escaped) { $escaped = $false }
            elseif ($ch -eq '\') { $escaped = $true }
            elseif ($ch -eq '"') { $insideString = $false }
            continue
        }
        if ($ch -eq '"') { $insideString = $true }
        elseif ($ch -eq $opening) { $depth++ }
        elseif ($ch -eq $closing) {
            $depth--
            if ($depth -eq 0) { return (ConvertFrom-Json -InputObject $Text.Substring($start, $i - $start + 1)) }
        }
    }
    throw "Unterminated JSON assignment: $VariableName"
}

# Text-based last resort for matching an activity to one of our locations,
# used only when neither DefaultFacilityId nor CenterId (see
# Get-LocationForActivity below) resolves it — e.g. the schedule page's HTML
# format changes and facilityList can no longer be extracted. DisplayFacility
# is free text ("San Antonio, Texas" in one real sample activity, which is
# NOT one of our 8 rinks), so this is deliberately the weakest signal.
function Get-LocationForFacilityText {
    param([string]$Facility)
    foreach ($location in $locations) {
        if ($Facility -match [regex]::Escape($location.name)) { return $location.name }
    }
    return $null
}

# Resolves an activity catalog entry to one of our 8 tracked locations using
# real foreign keys instead of text matching, most precise first:
#   1. DefaultFacilityId -> FacilityId, from each schedule page's own
#      facilityList (a specific rink/sheet of ice).
#   2. CenterId -> CenterId, also from facilityList (the whole physical
#      location — every facility at one StarCenter shares one CenterId).
#   3. DisplayFacility free text, as a last resort (see above).
# Returns $null if none of these resolve — correctly true for activities at
# locations we don't track (tournaments, other cities, etc.).
function Get-LocationForActivity {
    param(
        $Activity,
        [hashtable]$FacilityIdToLocation,
        [hashtable]$CenterIdToLocation
    )

    if ($Activity.DefaultFacilityId -and $FacilityIdToLocation.ContainsKey("$($Activity.DefaultFacilityId)")) {
        return $FacilityIdToLocation["$($Activity.DefaultFacilityId)"]
    }
    if ($Activity.CenterId -and $CenterIdToLocation.ContainsKey("$($Activity.CenterId)")) {
        return $CenterIdToLocation["$($Activity.CenterId)"]
    }
    return Get-LocationForFacilityText ([string]$Activity.DisplayFacility)
}

function Find-RelatedActivity {
    param([int]$EventTypeId, [string]$Description, [array]$Candidates, [hashtable]$CandidatesByEventTypeId)

    # The schedule and activity catalog both expose EventTypeId. This is the
    # authoritative relationship; do not use broad text-token matching.
    # Looked up in a prebuilt index rather than filtered per session, since
    # this runs once for each of several thousand sessions.
    $exact = @()
    $indexed = $CandidatesByEventTypeId["$EventTypeId"]
    if ($indexed) { $exact = $indexed.ToArray() }
    if ($exact.Count -eq 1) {
        return [pscustomobject]@{ Activity = $exact[0]; MatchMethod = 'eventTypeId'; MatchConfidence = 'exact' }
    }

    # Some catalog records can share an event type. The rendered schedule
    # description contains the specific activity name, so use an exact name
    # comparison as the only fallback.
    $descriptionName = ([regex]::Match([string]$Description, '^\s*Activity:\s*(.+?)\s*$', [Text.RegularExpressions.RegexOptions]::IgnoreCase)).Groups[1].Value
    if ($descriptionName) {
        $descriptionMatches = @($Candidates | Where-Object { $_.name -eq $descriptionName })
        if ($descriptionMatches.Count -eq 1) {
            return [pscustomobject]@{ Activity = $descriptionMatches[0]; MatchMethod = 'descriptionExact'; MatchConfidence = 'exact' }
        }
        $descriptionPrefixMatches = @($Candidates | Where-Object { $descriptionName.StartsWith([string]$_.name, [StringComparison]::OrdinalIgnoreCase) } | Sort-Object { $_.name.Length } -Descending)
        if ($descriptionPrefixMatches.Count -gt 0) {
            return [pscustomobject]@{ Activity = $descriptionPrefixMatches[0]; MatchMethod = 'descriptionPrefix'; MatchConfidence = 'exact' }
        }
    }

    if ($exact.Count -gt 1) {
        # Keep the result one-to-one while making ambiguity visible. Prefer,
        # in order: an activity whose online purchase window is open RIGHT
        # NOW (the strongest real-world signal that this is the one someone
        # would actually be signing up for), then the GeneralRegistrationOpen
        # flag, then a stable activityId tiebreak so results are repeatable.
        $selected = $exact |
            Sort-Object `
                @{ Expression = { if ($_.purchaseWindowOpen) { 0 } else { 1 } } }, `
                @{ Expression = { if ($_.registrationOpen) { 0 } else { 1 } } }, `
                activityId |
            Select-Object -First 1
        return [pscustomobject]@{ Activity = $selected; MatchMethod = 'eventTypeIdAmbiguous'; MatchConfidence = 'exact-id-ambiguous' }
    }

    return [pscustomobject]@{ Activity = $null; MatchMethod = 'unmatched'; MatchConfidence = 'none' }
}

# Fetches a URL with retry-free single attempt, returning $null instead of
# throwing on failure so one dead endpoint can't abort the whole run.
function Invoke-SafeWebRequest {
    param([string]$Uri, [int]$TimeoutSec, [string]$Label)
    try {
        return (Invoke-WebRequest -Uri $Uri -UseBasicParsing -TimeoutSec $TimeoutSec -Headers @{ 'User-Agent' = 'Mozilla/5.0' }).Content
    } catch {
        Write-Warning "Failed to fetch ${Label} (${Uri}): $($_.Exception.Message)"
        return $null
    }
}

$outputDirectory = Split-Path -Parent ([IO.Path]::GetFullPath($OutputPath))
New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
$cacheDirectory = Join-Path $outputDirectory 'cache'
New-Item -ItemType Directory -Path $cacheDirectory -Force | Out-Null
$cacheMaxAge = [TimeSpan]::FromHours($CacheTtlHours)

# ---------------------------------------------------------------------------
# PASS 1: fetch/cache every schedule page and hold onto both its session list
# AND its facilityList. facilityList is what lets us learn each location's
# CenterId/FacilityIds — the activity catalog can only be matched to a
# location AFTER this pass runs, so this now happens before the catalog
# fetch (previously the catalog was fetched first, using only text matching).
# ---------------------------------------------------------------------------
$scheduleCache = [ordered]@{}
$failedLocations = [System.Collections.Generic.List[string]]::new()

foreach ($page in $schedulePages.GetEnumerator()) {
    $scheduleId = ([uri]$page.Value).Segments[-1].TrimEnd('/')
    $cachePath = Join-Path $cacheDirectory "$scheduleId.html"

    $cacheIsFresh = $false
    if ((Test-Path $cachePath) -and -not $ForceRefresh) {
        $cacheAge = (Get-Date) - (Get-Item $cachePath).LastWriteTime
        $cacheIsFresh = $cacheAge -lt $cacheMaxAge
    }

    $html = $null
    if ($cacheIsFresh) {
        $html = Get-Content $cachePath -Raw -Encoding utf8
    } else {
        $html = Invoke-SafeWebRequest -Uri $page.Value -TimeoutSec $TimeoutSec -Label "$($page.Key) schedule"
        if ($html) {
            Set-Content $cachePath $html -Encoding utf8
        } elseif (Test-Path $cachePath) {
            # Live fetch failed but we have a (stale) cache — use it rather
            # than dropping the location from the output entirely.
            Write-Warning "Falling back to stale cache for $($page.Key)."
            $html = Get-Content $cachePath -Raw -Encoding utf8
        }
    }

    if (-not $html) {
        Write-Warning "Skipping $($page.Key): no live data and no cache available."
        $failedLocations.Add($page.Key)
        continue
    }

    $scheduleList = $null
    $facilityList = $null
    try {
        $scheduleList = Get-BalancedJsonValue $html '_onlineScheduleList'
        # facilityList/eventTypeList follow the same `_camelCaseName`
        # convention as the onlineScheduleList variable already relied on.
        # If the page's format ever changes and this extraction fails, we
        # degrade gracefully to the DisplayFacility text-match fallback
        # rather than aborting the whole location.
        $facilityList = Get-BalancedJsonValue $html '_facilityList'
    } catch {
        Write-Warning "Skipping $($page.Key): failed to parse schedule ($($_.Exception.Message))."
        $failedLocations.Add($page.Key)
        continue
    }

    $scheduleCache[$page.Key] = [ordered]@{
        sessions = @($scheduleList)
        facilities = @($facilityList)
        sourceUrl = $page.Value
    }
}

# Every facility on a given location's schedule page belongs to that one
# physical center, so its CenterId/SiteId is authoritative for the location.
foreach ($location in $locations) {
    $cached = $scheduleCache[$location.name]
    if (-not $cached -or $cached.facilities.Count -eq 0) { continue }

    $centerIds = @($cached.facilities | ForEach-Object { $_.CenterId } | Where-Object { $_ } | Select-Object -Unique)
    if ($centerIds.Count -gt 1) {
        Write-Warning "$($location.name): facilityList reports multiple CenterIds ($($centerIds -join ', ')) — using the first. Activity-to-location matching may be less precise here."
    }
    if ($centerIds.Count -ge 1) { $location.centerId = $centerIds[0] }

    $siteIds = @($cached.facilities | ForEach-Object { $_.SiteId } | Where-Object { $_ } | Select-Object -Unique)
    if ($siteIds.Count -ge 1) { $location.siteId = $siteIds[0] }
}

# Global lookups built from every location's facilityList, used both to
# resolve an activity's location (Get-LocationForActivity) and to resolve a
# session's rink display name (ShortName) from its raw FacilityId, replacing
# the previous "strip a 2-letter prefix off FacilityName with regex"
# approach with a real lookup — falling back to that regex only if a
# FacilityId isn't found here.
$facilityIdToLocation = @{}
$facilityIdToShortName = @{}
$centerIdToLocation = @{}
foreach ($location in $locations) {
    $cached = $scheduleCache[$location.name]
    if (-not $cached) { continue }
    foreach ($facility in $cached.facilities) {
        if (-not $facility.FacilityId) { continue }
        $facilityIdToLocation["$($facility.FacilityId)"] = $location.name
        if ($facility.ShortName) {
            $facilityIdToShortName["$($facility.FacilityId)"] = [string]$facility.ShortName
        }
    }
    if ($location.centerId -and -not $centerIdToLocation.ContainsKey("$($location.centerId)")) {
        $centerIdToLocation["$($location.centerId)"] = $location.name
    }
}

# ---------------------------------------------------------------------------
# PASS 2: fetch and normalize the activity catalog, now resolving each
# activity's location via the real FacilityId/CenterId keys gathered above
# instead of fuzzy-matching DisplayFacility text. If the catalog fetch fails
# entirely, scraping continues with an empty catalog rather than aborting;
# sessions will just come back unmatched (matchMethod = 'unmatched').
# ---------------------------------------------------------------------------
$activityHtml = Invoke-SafeWebRequest -Uri $ActivityListUrl -TimeoutSec $TimeoutSec -Label 'activity catalog'
$activityList = if ($activityHtml) {
    try { Get-BalancedJsonValue $activityHtml '_activityList' }
    catch { Write-Warning "Failed to parse activity catalog: $($_.Exception.Message)"; @() }
} else { @() }
$baseUrl = ([Uri]$ActivityListUrl).GetLeftPart([UriPartial]::Authority)
$now = Get-Date
$activities = @($activityList | ForEach-Object {
    $route = if ($_.ActivityRegistrationTypeId -eq 6) { "registration/activityitemdynamic/$($_.ActivityId)" } elseif ($_.ActivityRegistrationTypeId -in @(1, 2, 4)) { "registration/activityitemv2/$($_.ActivityId)" } else { "registration/activityitem/$($_.ActivityId)" }

    # True only if today falls inside the activity's own online purchase
    # window — a stronger, time-aware signal than the static
    # GeneralRegistrationOpen flag alone, used to break ties between
    # multiple candidates that share an EventTypeId (see Find-RelatedActivity).
    $purchaseWindowOpen = $false
    if ($_.OnlinePurchaseStartDate -and $_.OnlinePurchaseEndDate) {
        try {
            $purchaseWindowOpen = ($now -ge [datetime]$_.OnlinePurchaseStartDate) -and ($now -le [datetime]$_.OnlinePurchaseEndDate)
        } catch { $purchaseWindowOpen = $false }
    }

    [ordered]@{
        activityId = $_.ActivityId; eventTypeId = $_.EventTypeId; name = $_.Name; type = $_.DisplayActivityType; registrationType = $_.DisplayActivityRegistrationType
        facility = [string]$_.DisplayFacility; centerId = $_.CenterId; siteId = $_.SiteId; defaultFacilityId = $_.DefaultFacilityId
        location = (Get-LocationForActivity $_ $facilityIdToLocation $centerIdToLocation)
        activityDate = $_.DisplayActivityDate
        registrationOpen = $_.GeneralRegistrationOpen; earlyBirdRegistrationOpen = $_.EarlyBirdRegistrationOpen
        purchaseWindowOpen = $purchaseWindowOpen
        onlinePurchaseStartDate = $_.OnlinePurchaseStartDate; onlinePurchaseEndDate = $_.OnlinePurchaseEndDate
        displayInfo = $_.DisplayInfo; signupUrl = "$baseUrl/$route"
    }
})

$activitiesByLocation = @{}
$activitiesByLocationAndEventType = @{}
foreach ($location in $locations) {
    $locationActivities = @($activities | Where-Object { $_.location -eq $location.name })
    $activitiesByLocation[$location.name] = $locationActivities

    $byEventType = @{}
    foreach ($activity in $locationActivities) {
        $key = "$($activity.eventTypeId)"
        if (-not $byEventType.ContainsKey($key)) {
            $byEventType[$key] = [System.Collections.Generic.List[object]]::new()
        }
        $byEventType[$key].Add($activity)
    }
    $activitiesByLocationAndEventType[$location.name] = $byEventType
}

# ---------------------------------------------------------------------------
# PASS 3: build the final session list from the cached schedule data (no
# re-fetching — everything needed was already gathered in Pass 1), matching
# each session to an activity via Find-RelatedActivity.
# ---------------------------------------------------------------------------
$sessions = [System.Collections.Generic.List[object]]::new()
# Sessions that ended before today are dropped: the app never shows the past,
# and they'd only add weight to the bundled JSON.
$today = (Get-Date).Date

foreach ($page in $schedulePages.GetEnumerator()) {
    $cached = $scheduleCache[$page.Key]
    if (-not $cached) { continue }

    foreach ($session in $cached.sessions) {
        $startValue = if ($session.EventStartTime) { $session.EventStartTime } else { $session.start }
        $endValue = if ($session.EventEndTime) { $session.EventEndTime } else { $session.end }
        $start = if ($startValue) { [datetime]$startValue } else { $null }
        $end = if ($endValue) { [datetime]$endValue } else { $null }
        if ($start -and $start.Date -lt $today) { continue }
        $activityName = [string]$session.EventTypeName
        $description = [string]$session.Description
        $candidateActivities = $activitiesByLocation[$page.Key]
        $match = Find-RelatedActivity ([int]$session.EventTypeId) $description $candidateActivities $activitiesByLocationAndEventType[$page.Key]
        # Wrapped in @() around the whole `if`: `$x = if (...) { @($y) }`
        # unrolls a one-element array back into the bare hashtable, whose
        # .Count is its key count, not 1.
        $related = @(if ($match.Activity) { $match.Activity })

        # Prefer a real ShortName lookup by FacilityId over the old regex
        # strip of FacilityName; fall back to the regex only if this
        # session's FacilityId wasn't in the facilityList we captured.
        $rink = $null
        if ($session.FacilityId -and $facilityIdToShortName.ContainsKey("$($session.FacilityId)")) {
            $rink = $facilityIdToShortName["$($session.FacilityId)"]
        } else {
            $rink = ([string]$session.FacilityName -replace '^\s*[A-Z]{2}\s*-\s*', '')
        }

        $sessions.Add([ordered]@{
            # Sort-only key (removed before output): 'h:mm tt' strings sort
            # "10:00 AM" before "6:00 AM", an ISO timestamp doesn't.
            sortKey = if ($start) { $start.ToString('s') } else { '' }
            date = if ($start) { $start.ToString('yyyy-MM-dd') } else { $null }
            day = if ($start) { $start.ToString('dddd') } else { $null }
            startTime = if ($start) { $start.ToString('h:mm tt') } else { $null }
            endTime = if ($end) { $end.ToString('h:mm tt') } else { $null }
            location = $page.Key
            rink = $rink
            activity = $activityName
            description = $description
            eventTypeId = $session.EventTypeId
            eventId = $session.EventId
            facilityId = $session.FacilityId
            signupActivities = $related
            signupUrls = @($related | ForEach-Object { $_.signupUrl })
            signupUrl = if ($related.Count -eq 1) { $related[0].signupUrl } else { $null }
            matchMethod = $match.MatchMethod
            matchConfidence = $match.MatchConfidence
            sourceUrl = $cached.sourceUrl
        })
    }
}

$sessionArray = @($sessions.ToArray() | Sort-Object { $_.location }, { $_.sortKey }, { $_.rink })
foreach ($session in $sessionArray) { $session.Remove('sortKey') }
$uniqueActivities = @($sessionArray | Group-Object -Property @{ Expression = { "$($_.location)|$($_.activity)" } } | ForEach-Object {
    $first = $_.Group[0]
    [ordered]@{
        location = $first.location
        activity = $first.activity
        sessionCount = $_.Count
        signupActivities = @($first.signupActivities)
        signupUrls = @($first.signupUrls)
    }
})

$groupedLocations = @($locations | ForEach-Object {
    $locationName = $_.name
    [ordered]@{
        location = $_
        activities = @($activitiesByLocation[$locationName])
        scheduledActivities = @($uniqueActivities | Where-Object { $_.location -eq $locationName })
    }
})

$retrievedAt = (Get-Date).ToUniversalTime().ToString('o')

if ($WriteFullData) {
    $fullResult = [ordered]@{
        retrievedAt = $retrievedAt
        scheduleSource = 'https://starcenter.finnlyconnect.com/schedule/{868,961,962,963,964,965,966,967}'
        activitySource = $ActivityListUrl
        locationCount = $locations.Count
        activityCount = $activities.Count
        sessionCount = $sessions.Count
        uniqueScheduledActivityCount = $uniqueActivities.Count
        failedLocations = @($failedLocations)
        locations = $groupedLocations
        uniqueScheduledActivities = $uniqueActivities
        sessions = $sessionArray
    }
    $fullOutputPath = Join-Path $cacheDirectory 'schedule-data.full.json'
    $fullResult | ConvertTo-Json -Depth 30 | Set-Content -Path $fullOutputPath -Encoding utf8
    Write-Host "Full data: $fullOutputPath"
}

# ---------------------------------------------------------------------------
# APP OUTPUT: this file is bundled into the web app's JavaScript, so it holds
# only the fields App.tsx reads. Each location's scheduleUrl stands in for a
# per-session sourceUrl (all sessions at a location share it).
# ---------------------------------------------------------------------------
$appResult = [ordered]@{
    retrievedAt = $retrievedAt
    failedLocations = @($failedLocations)
    locations = @($locations | ForEach-Object {
        [ordered]@{
            name = $_.name
            address = $_.address
            city = $_.city
            state = $_.state
            postalCode = $_.postalCode
            scheduleUrl = $_.scheduleUrl
        }
    })
    sessions = @($sessionArray | ForEach-Object {
        [ordered]@{
            date = $_.date
            day = $_.day
            startTime = $_.startTime
            endTime = $_.endTime
            location = $_.location
            rink = $_.rink
            activity = $_.activity
            description = $_.description
            eventId = $_.eventId
            signupUrl = $_.signupUrl
            matchConfidence = $_.matchConfidence
        }
    })
}

$appResult | ConvertTo-Json -Depth 5 | Set-Content -Path $OutputPath -Encoding utf8
Write-Host "Activities: $($activities.Count)"
Write-Host "Sessions: $($sessions.Count)"
Write-Host "Unique scheduled activities: $($uniqueActivities.Count)"
$unresolvedLocationActivities = @($activities | Where-Object { -not $_.location }).Count
if ($unresolvedLocationActivities -gt 0) {
    Write-Host "Activities not matched to any tracked location (expected for tournaments/other cities): $unresolvedLocationActivities"
}
if ($failedLocations.Count -gt 0) {
    Write-Warning "Locations with no data this run: $($failedLocations -join ', ')"
}
Write-Host "Output: $OutputPath"