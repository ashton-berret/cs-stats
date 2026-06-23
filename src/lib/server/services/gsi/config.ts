export const GSI_CONFIG_FILENAME = "gamestate_integration_csstats.cfg";

/** Builds the CS2 GSI config file contents that point the game at our local endpoint. */
export function buildGsiConfig(token: string, endpoint: string): string {
  return `"CS2 Stats Tracker"
{
    "uri"       "${endpoint}"
    "timeout"   "5.0"
    "buffer"    "0.1"
    "throttle"  "0.5"
    "heartbeat" "30.0"
    "auth"
    {
        "token" "${token}"
    }
    "data"
    {
        "provider"           "1"
        "map"                "1"
        "round"              "1"
        "player_id"          "1"
        "player_state"       "1"
        "player_match_stats" "1"
    }
}
`;
}
