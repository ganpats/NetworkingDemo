async function fetchStory() {
  const params = new URLSearchParams(window.location.search);
  const OrgId = params.get("OrgId");
  const detailContainer = document.getElementById("story-detail");

  if (!OrgId) {
    detailContainer.innerHTML = `<p class="loading">Invalid story.</p>`;
    return;
  }

  try {
    const res = await fetch(
      `https://epaper.patrika.com/User/ShowArticleView?OrgId=${OrgId}`
    );
    const story = await res.json();

    detailContainer.innerHTML = "";

    // Headlines
    if (story.StoryContent && story.StoryContent.length > 0) {
      story.StoryContent[0].Headlines.forEach((hl) => {
        const h2 = document.createElement("h2");
        h2.textContent = hl;
        detailContainer.appendChild(h2);
      });

      // Pick last image (if available)
      if (story.LinkPicture && story.LinkPicture.length > 0) {
        const lastImage = story.LinkPicture[story.LinkPicture.length - 1];
        if (lastImage.fullpathlinkpic) {
          const img = document.createElement("img");
          img.src = lastImage.fullpathlinkpic;
          detailContainer.appendChild(img);
        }
      }

      // Body after image
      const body = document.createElement("div");
      body.innerHTML = story.StoryContent[0].Body || "";
      detailContainer.appendChild(body);
    }
  } catch (err) {
    console.error(err);
    detailContainer.innerHTML = `<p class="loading">Failed to load story.</p>`;
  }
}

// Back button
document.getElementById("back-btn").addEventListener("click", () => {
  window.history.back();
});

fetchStory();