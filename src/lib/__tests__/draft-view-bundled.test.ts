import { describe, expect, it } from "vitest";
import type { OrderDraftContext } from "@/lib/draft";
import { createDraft } from "@/lib/draft";
import { getMenuItem } from "@/lib/fixtures";
import { getDraftCartView } from "@/lib/draft-view";
import { buildDefaultDraftLineItem } from "@/lib/line-item";

function draftWithItems(itemIds: string[]): OrderDraftContext {
  const draft = createDraft();
  const items = itemIds.flatMap((id) => {
    const item = getMenuItem(id);
    return item ? [buildDefaultDraftLineItem(item)] : [];
  });
  return { ...draft, lineItems: items };
}

describe("getDraftCartView bundledSubItems", () => {
  it("returns empty record when cart is empty", () => {
    const view = getDraftCartView(createDraft());
    expect(view.bundledSubItems).toEqual({});
  });

  it("attaches gloves to раки варёные line", () => {
    const view = getDraftCartView(draftWithItems(["item_crayfish_boiled"]));
    expect(view.bundledSubItems[0]).toBeDefined();
    expect(view.bundledSubItems[0][0].id).toBe("accessory_gloves");
  });

  it("attaches гренка to мидии but not to икра", () => {
    const view = getDraftCartView(
      draftWithItems(["item_mussels_pesto", "item_caviar_red"]),
    );
    expect(view.bundledSubItems[0]?.[0].id).toBe("accessory_bread_toast");
    expect(view.bundledSubItems[1]).toBeUndefined();
  });

  it("skips lines with no bundled accessories (shrimp)", () => {
    const view = getDraftCartView(
      draftWithItems(["item_shrimp_magadan_boiled"]),
    );
    expect(view.bundledSubItems).toEqual({});
  });
});
