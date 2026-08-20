import { createHashRouter, Navigate, useParams } from "react-router-dom";
import { App } from "../App";
import { PlayTab } from "../components/tabs/PlayTab";
import { ProfileDetailViewV2Wrapper } from "../components/profiles/ProfileDetailViewV2Wrapper";
import ModrinthTabV2 from "../components/tabs/ModrinthTabV2";
import VXLStudiosTabV2 from "../components/tabs/VXLStudiosTabV2";
import { SkinsTab } from "../components/tabs/SkinsTab";
import { StoreTab } from "../components/tabs/StoreTab";
import { SettingsRedirect } from "../components/settings/SettingsRedirect";
import { BrowseTab } from "../components/profiles/detail/BrowseTab";
import { BrowseTabWrapper } from "../components/profiles/BrowseTabWrapper";
import { ProfilesTabV2 } from "../components/tabs/ProfilesTabV2";
import { ModDetailPage } from "../components/mods/ModDetailPage";

function LegacyProfileRedirect() {
  const { profileId } = useParams();
  return <Navigate to={`/profiles/${profileId ?? ""}`} replace />;
}

function LegacyBrowseRedirect() {
  const { profileId, contentType } = useParams();
  return (
    <Navigate
      to={`/profiles/${profileId ?? ""}/browse/${contentType ?? ""}`}
      replace
    />
  );
}

export const router = createHashRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <Navigate to="/play" replace />,
      },
      {
        path: "play",
        element: <PlayTab />,
      },
      {
        path: "profiles/:profileId",
        element: <ProfileDetailViewV2Wrapper />,
      },
      {
        path: "profilesv2/:profileId",
        element: <LegacyProfileRedirect />,
      },
      {
        path: "profilesv2/:profileId/browse/:contentType",
        element: <LegacyBrowseRedirect />,
      },
      {
        path: "profiles",
        element: <ProfilesTabV2 />,
      },
      {
        path: "profiles/:profileId/browse/:contentType",
        element: <BrowseTab />,
      },
      {
        path: "mods",
        element: <ModrinthTabV2 />,
      },
      {
        path: "mods/:source/:projectId",
        element: <ModDetailPage />,
      },
      {
        path: "vxlstudios",
        element: <VXLStudiosTabV2 />,
      },
      {
        path: "skins",
        element: <SkinsTab />,
      },
      {
        path: "capes",
        element: <StoreTab />,
      },
      {
        path: "settings",
        element: <SettingsRedirect />,
      },
    ],
  },
]);
