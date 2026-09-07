import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TILE_TYPES = [
  "grass", "forest", "jungle", "dirt", "sand", "stone",
  "mountain", "snow", "ice", "swamp", "water", "lava",
];

const resourceSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    description: { type: "string" },
    rarity: { type: "string", enum: ["common", "uncommon", "rare", "epic", "legendary"] },
    category: { type: "string" },
    coinValue: { type: "number" },
    gatherTime: { type: "number" },
    spawnTiles: { type: "array", items: { type: "string", enum: TILE_TYPES } },
    spawnChance: { type: "number" },
    consumable: { type: "boolean" },
    healthGain: { type: "number" },
    canInflictDamage: { type: "boolean" },
    damage: { type: "number" },
    placeable: { type: "boolean" },
    passable: { type: "boolean" },
    destructible: { type: "boolean" },
    maxLife: { type: "number" },
    isFloating: { type: "boolean" },
    givesXp: { type: "boolean" },
    xpAmount: { type: "number" },
    imagePrompt: { type: "string" },
  },
  required: [
    "name", "description", "rarity", "category", "coinValue", "gatherTime",
    "spawnTiles", "spawnChance", "consumable", "healthGain", "canInflictDamage",
    "damage", "placeable", "passable", "destructible", "maxLife", "isFloating",
    "givesXp", "xpAmount", "imagePrompt",
  ],
  additionalProperties: false,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI is not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { itemName, references } = await req.json();
    if (!itemName || typeof itemName !== "string") {
      return new Response(JSON.stringify({ error: "itemName is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const refText = Array.isArray(references) && references.length
      ? references.slice(0, 40).map((r: Record<string, unknown>) => JSON.stringify(r)).join("\n")
      : "(no existing resources)";

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.7-flash",
        messages: [
          {
            role: "system",
            content:
              "You design items for a 32-bit tile-based survival/economy game. " +
              "Given an item name, fill in balanced properties consistent with the existing resources provided as reference " +
              "(match their pricing scale, gather times, rarity distribution and category naming). " +
              "gatherTime is in seconds (usually 1-5). spawnChance is 0 to 1 (use 0 for crafted/manufactured items). " +
              "spawnTiles must only contain terrain types where the item would naturally occur (empty for crafted items). " +
              "imagePrompt must describe the item as a single centered 32-bit pixel-art game icon on a plain white background.",
          },
          {
            role: "user",
            content: `Item name: "${itemName}"\n\nExisting resources for reference:\n${refText}`,
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "create_resource",
            description: "Return the generated game resource properties",
            parameters: resourceSchema,
          },
        }],
        tool_choice: { type: "function", function: { name: "create_resource" } },
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      return new Response(JSON.stringify({ error: text || "AI request failed" }), {
        status: aiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiRes.json();
    const args = aiJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) {
      return new Response(JSON.stringify({ error: "AI returned no resource" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const resource = JSON.parse(args);

    // Generate the icon image
    let iconUrl: string | null = null;
    try {
      const imgRes = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3.1-flash-image",
          messages: [{
            role: "user",
            content:
              `${resource.imagePrompt || itemName}. Single centered 32-bit pixel-art game item icon of "${itemName}", ` +
              `crisp pixel edges, vibrant Stardew-Valley-like palette, no text, no shadow, plain solid white background.`,
          }],
          modalities: ["image", "text"],
        }),
      });

      if (imgRes.ok) {
        const imgJson = await imgRes.json();
        const b64 = imgJson?.data?.[0]?.b64_json;
        if (b64) {
          const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
          const supabase = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          );
          const path = `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
          const { error: upErr } = await supabase.storage
            .from("resource-icons")
            .upload(path, bytes, { contentType: "image/png", upsert: true });
          if (!upErr) {
            iconUrl = supabase.storage.from("resource-icons").getPublicUrl(path).data.publicUrl;
          } else {
            console.error("upload error", upErr);
          }
        }
      } else {
        console.error("image gen failed", imgRes.status, await imgRes.text());
      }
    } catch (e) {
      console.error("image generation error", e);
    }

    delete resource.imagePrompt;

    return new Response(JSON.stringify({ resource, iconUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
