(() => {
  const URL_PATTERN = /^https?:\/\/[^\s<>]+$/i;
  const PREVIEW_API = "https://api.microlink.io/";

  function getUrl(value) {
    const url = value.trim();
    return URL_PATTERN.test(url) ? url : null;
  }

  function brandName(url) {
    try {
      const host = new URL(url).hostname.replace(/^www\./i, "");
      return host.split(".")[0].replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
    } catch {
      return "Link";
    }
  }

  function createCard(url, source) {
    const title = source?.getAttribute("title") || brandName(url);
    const description = source?.getAttribute("description") || `Visit ${new URL(url).hostname}`;
    const image = source?.getAttribute("image");

    const wrapper = document.createElement("div");
    wrapper.className = "av-link-embed";
    wrapper.dataset.embedUrl = url;

    const link = document.createElement("a");
    link.className = "av-link-embed__link";
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    const content = document.createElement("span");
    content.className = "av-link-embed__content";

    const titleElement = document.createElement("span");
    titleElement.className = "av-link-embed__title";
    titleElement.textContent = title;

    const descriptionElement = document.createElement("span");
    descriptionElement.className = "av-link-embed__description";
    descriptionElement.textContent = description;

    const urlElement = document.createElement("span");
    urlElement.className = "av-link-embed__url";
    urlElement.textContent = url;

    content.append(titleElement, descriptionElement, urlElement);

    const media = document.createElement("span");
    media.className = "av-link-embed__media";
    if (image) {
      const imageElement = document.createElement("img");
      imageElement.src = image;
      imageElement.alt = "";
      imageElement.loading = "lazy";
      imageElement.referrerPolicy = "no-referrer";
      media.append(imageElement);
    } else {
      const mark = document.createElement("span");
      mark.className = "av-link-embed__mark";
      mark.textContent = brandName(url).charAt(0).toUpperCase();
      media.append(mark);
    }

    link.append(content, media);
    wrapper.append(link);
    hydrateCard(wrapper, url);
    return wrapper;
  }

  function imageUrl(value) {
    if (typeof value === "string") return value;
    return value?.url || null;
  }

  function hydrateCard(card, url) {
    const cacheKey = `av-link-embed:${url}`;
    let cached = null;
    try {
      cached = JSON.parse(sessionStorage.getItem(cacheKey) || "null");
    } catch {
      cached = null;
    }

    const applyMetadata = (metadata) => {
      if (!metadata) return;
      const title = metadata.title || metadata.siteName;
      const description = metadata.description;
      const image = imageUrl(metadata.image) || imageUrl(metadata.logo);
      if (title) card.querySelector(".av-link-embed__title").textContent = title;
      if (description) card.querySelector(".av-link-embed__description").textContent = description;
      if (image) {
        const media = card.querySelector(".av-link-embed__media");
        const imageElement = document.createElement("img");
        imageElement.src = image;
        imageElement.alt = "";
        imageElement.loading = "lazy";
        imageElement.referrerPolicy = "no-referrer";
        media.replaceChildren(imageElement);
      }
      card.classList.add("av-link-embed--loaded");
    };

    if (cached) {
      applyMetadata(cached);
      return;
    }

    const endpoint = `${PREVIEW_API}?url=${encodeURIComponent(url)}&filter=title,description,siteName,image,logo.url`;
    fetch(endpoint, { credentials: "omit" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        const metadata = payload?.data || null;
        if (!metadata) return;
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(metadata));
        } catch {
          // Storage is optional; the card still works without it.
        }
        applyMetadata(metadata);
      })
      .catch(() => {
        // Keep the local fallback card when metadata is unavailable.
      });
  }

  function replaceStandaloneParagraphs(root) {
    root.querySelectorAll(".av-body p").forEach((paragraph) => {
      if (paragraph.children.length !== 1 || paragraph.textContent.trim() !== paragraph.firstElementChild.textContent.trim()) {
        return;
      }

      const link = paragraph.firstElementChild;
      if (link.tagName !== "A" || link.children.length || link.textContent.trim() !== link.href.trim()) {
        return;
      }

      const url = getUrl(link.href);
      if (url) {
        paragraph.replaceWith(createCard(url));
      }
    });
  }

  function replaceExplicitEmbeds(root) {
    root.querySelectorAll(".av-body emb").forEach((embed) => {
      const url = getUrl(embed.textContent);
      if (!url) return;

      const parent = embed.parentElement;
      const replacement = createCard(url, embed);
      if (parent?.tagName === "P" && parent.children.length === 1 && parent.textContent.trim() === embed.textContent.trim()) {
        parent.replaceWith(replacement);
      } else {
        embed.replaceWith(replacement);
      }
    });
  }

  function enhanceEmbeds() {
    document.querySelectorAll(".av-body").forEach((body) => {
      replaceExplicitEmbeds(body);
      replaceStandaloneParagraphs(body);
    });
  }

  if (typeof document$ !== "undefined") {
    document$.subscribe(enhanceEmbeds);
  } else if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enhanceEmbeds);
  } else {
    enhanceEmbeds();
  }
})();
