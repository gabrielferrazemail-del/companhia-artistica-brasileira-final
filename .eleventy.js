const Image = require("@11ty/eleventy-img");
const path = require("path");

module.exports = function (eleventyConfig) {
  // Passthrough
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/uploads");

  // Collections
  // Ordem das exposições: primeiro por status (em cartaz → em breve → encerrada →
  // rascunho), depois pela ordem manual definida no painel (campo `order`), e por
  // fim pela data (mais recente primeiro) como desempate.
  const EXPO_RANK = { "em-cartaz": 0, "em-breve": 1, "encerrada": 2, "rascunho": 3 };
  function expoOrderValue(data) {
    const n = Number(data.order);
    return Number.isFinite(n) && data.order !== "" && data.order != null ? n : Infinity;
  }
  eleventyConfig.addCollection("exposicoes", (api) =>
    api.getFilteredByGlob("src/exposicoes/*.md").sort((a, b) => {
      const ra = EXPO_RANK[a.data.effectiveStatus] ?? 9;
      const rb = EXPO_RANK[b.data.effectiveStatus] ?? 9;
      if (ra !== rb) return ra - rb;
      const oa = expoOrderValue(a.data);
      const ob = expoOrderValue(b.data);
      if (oa !== ob) return oa - ob;
      return (b.data.start_date || "") > (a.data.start_date || "") ? 1 : -1;
    })
  );

  eleventyConfig.addCollection("artistas", (api) =>
    api.getFilteredByGlob("src/artistas/*.md").sort((a, b) =>
      (a.data.name || "").localeCompare(b.data.name || "", "pt-BR")
    )
  );

  // Participações de uma exposição: novo formato plano (data.participations) ou,
  // se ausente, achata o formato antigo (data.sessions[].participations).
  function participationsOf(data) {
    if (Array.isArray(data.participations)) return data.participations;
    const out = [];
    for (const s of data.sessions || []) {
      for (const p of s.participations || []) out.push(p);
    }
    return out;
  }

  // Filters
  eleventyConfig.addFilter("worksByArtist", (exposicoes, slug) => {
    const out = [];
    for (const expo of exposicoes) {
      const works = [];
      for (const p of participationsOf(expo.data)) {
        if (p.artist === slug && (p.works || []).length)
          works.push(...p.works);
      }
      if (works.length) out.push({ exhibition: expo, works });
    }
    return out;
  });

  eleventyConfig.addFilter("exhibitionsByArtist", (exposicoes, slug) => {
    return exposicoes.filter((expo) =>
      participationsOf(expo.data).some((p) => p.artist === slug)
    );
  });

  // Recebe um array de participações; deduplica por slug preservando a ordem.
  eleventyConfig.addFilter("artistsInExposition", (participations) => {
    const seen = new Set();
    const artists = [];
    for (const p of participations || []) {
      if (p && p.artist && !seen.has(p.artist)) {
        seen.add(p.artist);
        artists.push(p.artist);
      }
    }
    return artists;
  });

  eleventyConfig.addFilter("formatDate", (date) => {
    if (!date) return "";
    const d = new Date(date);
    // timeZone UTC: as datas do frontmatter são "date-only" (meia-noite UTC);
    // sem isso o fuso de Brasília (-3) volta um dia (13 vira 12).
    return d.toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  });

  eleventyConfig.addFilter("formatDateShort", (date) => {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" });
  });

  // Pad a number with leading zeros
  eleventyConfig.addFilter("padNum", (n, len = 2) =>
    String(n).padStart(len, "0")
  );

  // Rótulo PT do status
  eleventyConfig.addFilter("statusLabel", (status) => {
    const map = {
      "em-cartaz": "em cartaz",
      "em-breve": "em breve",
      "encerrada": "encerrada",
      "rascunho": "rascunho",
    };
    return map[status] || status || "";
  });

  // Lookup an artist by slug from the artistas collection
  eleventyConfig.addFilter("getArtist", (artistas, slug) =>
    (artistas || []).find((a) => a.data.slug === slug) || null
  );

  // Shortcode: optimized image
  eleventyConfig.addAsyncShortcode("image", async (src, alt, sizes = "100vw", widths = [400, 800, 1200]) => {
    if (!src) return "";
    const fullSrc = src.startsWith("/") ? `./src${src}` : src;
    try {
      const meta = await Image(fullSrc, {
        widths,
        formats: ["webp", "jpeg"],
        outputDir: "./_site/img/",
        urlPath: "/img/",
      });
      return Image.generateHTML(meta, { alt, sizes, loading: "lazy", decoding: "async" });
    } catch {
      return `<img src="${src}" alt="${alt}" loading="lazy">`;
    }
  });

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data",
    },
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
    templateFormats: ["njk", "md", "html"],
  };
};
