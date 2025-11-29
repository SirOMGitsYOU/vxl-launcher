"use client";

import { EmptyState } from "../ui/EmptyState";
import { TabLayout } from "../ui/TabLayout";

export function NewsTab() {
  return (
    <TabLayout title="Servers" icon="streamline-cyber:server">
      <EmptyState message="Servers Coming Soon" icon="streamline-cyber:server" />
    </TabLayout>
  );
}
