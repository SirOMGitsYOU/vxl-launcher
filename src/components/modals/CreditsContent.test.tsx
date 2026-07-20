import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CreditsContent } from "./CreditsContent";

describe("CreditsContent", () => {
  it("renders Voxel Studios with expected role", () => {
    const { container } = render(<CreditsContent />);
    expect(container.textContent).toContain("Voxel Studios");
    expect(container.textContent).toContain("Frontend, UI, Code & API");
  });
});
