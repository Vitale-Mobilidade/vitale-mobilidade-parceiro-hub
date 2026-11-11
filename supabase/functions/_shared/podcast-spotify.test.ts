import { expect, it } from "vitest";
import { matchSpotifyEpisodes } from "./podcast-spotify";
const id = "1IqFTdEUfqnh9PAuvndsFG";
const episode = (spotifyId: string, title: string) =>
  `<a href="/episode/${spotifyId}"><h4 data-testid="episodeTitle"><span></span>${title}</h4></a>`;
const row = { youtube_id: "byk0-p8NedQ", title: "Luz & direção", spotify_episode_id: null };
it("associates only an exact unique released episode from the Spotify show", () => {
  const source = episode(id, "Luz &amp; direção");
  expect(matchSpotifyEpisodes(source, [row])).toEqual([{ youtube_id: row.youtube_id, spotify_episode_id: id }]);
  expect(matchSpotifyEpisodes(source, [{ ...row, title: "Luz" }])).toEqual([]);
  expect(matchSpotifyEpisodes(source, [row, { ...row, youtube_id: "duplicate01" }])).toEqual([]);
  expect(matchSpotifyEpisodes(source + episode("324BQ31Y26a5askghi34ax", "Luz &amp; direção"), [row])).toEqual([]);
  expect(matchSpotifyEpisodes(source, [{ ...row, spotify_episode_id: id }])).toEqual([]);
});
