import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProfileStore } from "./profile-store";
import * as ProfileService from "../services/profile-service";

vi.mock("../services/profile-service", () => ({
  getAllProfilesAndLastPlayed: vi.fn(),
}));

describe("profile-store fetchProfiles", () => {
  beforeEach(() => {
    useProfileStore.setState({
      profiles: [],
      loading: true,
      error: null,
      profilesLoaded: false,
      selectedProfile: null,
      lastPlayedProfileId: null,
    });
    vi.mocked(ProfileService.getAllProfilesAndLastPlayed).mockReset();
  });

  it("sets loading true while fetching", async () => {
    let resolveFetch!: () => void;
    const pending = new Promise<void>((resolve) => {
      resolveFetch = resolve;
    });

    vi.mocked(ProfileService.getAllProfilesAndLastPlayed).mockImplementation(
      async () => {
        await pending;
        return { all_profiles: [], last_played_profile_id: null };
      },
    );

    const fetchPromise = useProfileStore.getState().fetchProfiles(true);
    expect(useProfileStore.getState().loading).toBe(true);

    resolveFetch();
    await fetchPromise;
    expect(useProfileStore.getState().loading).toBe(false);
    expect(useProfileStore.getState().profilesLoaded).toBe(true);
  });

  it("skips fetch when already loaded unless forced", async () => {
    useProfileStore.setState({ profilesLoaded: true });
    await useProfileStore.getState().fetchProfiles(false);
    expect(ProfileService.getAllProfilesAndLastPlayed).not.toHaveBeenCalled();

    vi.mocked(ProfileService.getAllProfilesAndLastPlayed).mockResolvedValue({
      all_profiles: [],
      last_played_profile_id: null,
    });
    await useProfileStore.getState().fetchProfiles(true);
    expect(ProfileService.getAllProfilesAndLastPlayed).toHaveBeenCalledTimes(1);
    expect(useProfileStore.getState().loading).toBe(false);
  });

  it("does not flip loading true on a background refresh", async () => {
    vi.mocked(ProfileService.getAllProfilesAndLastPlayed).mockResolvedValue({
      all_profiles: [],
      last_played_profile_id: null,
    });

    await useProfileStore.getState().fetchProfiles(true);
    expect(useProfileStore.getState().loading).toBe(false);
    expect(useProfileStore.getState().profilesLoaded).toBe(true);

    let resolveFetch!: () => void;
    const pending = new Promise<void>((resolve) => {
      resolveFetch = resolve;
    });
    vi.mocked(ProfileService.getAllProfilesAndLastPlayed).mockImplementation(
      async () => {
        await pending;
        return { all_profiles: [], last_played_profile_id: null };
      },
    );

    const refreshPromise = useProfileStore.getState().fetchProfiles(true);
    expect(useProfileStore.getState().loading).toBe(false);

    resolveFetch();
    await refreshPromise;
    expect(useProfileStore.getState().loading).toBe(false);
  });
});
