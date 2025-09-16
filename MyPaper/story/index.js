let pages = [];
let currentPageIndex = 0;
let isLoading = false;

const storyList = document.getElementById("story-list");

// Format today's date as dd/MM/yyyy
const today = new Date();
const formattedDate = today.toLocaleDateString("en-GB"); // dd/MM/yyyy

async function init() {
  storyList.innerHTML = `<p class="loading">Fetching pages...</p>`;
  try {
    // Fetch all pages once
    const pagesRes = await fetch(
      `https://epaper.patrika.com/Home/GetAllpages?editionid=52&editiondate=${formattedDate}`
    );
    pages = await pagesRes.json();

    storyList.innerHTML = "";
    if (pages.length === 0) {
      storyList.innerHTML = `<p class="loading">No pages available.</p>`;
      return;
    }

    // Load first page stories
    loadNextPageStories();
  } catch (err) {
    console.error(err);
    storyList.innerHTML = `<p class="loading">Failed to load stories.</p>`;
  }
}

async function loadNextPageStories() {
  if (isLoading || currentPageIndex >= pages.length) return;
  isLoading = true;

  const page = pages[currentPageIndex];
  const loader = document.createElement("p");
  loader.className = "loading";
  loader.textContent = `Loading Page ${page.PageNo} stories...`;
  storyList.appendChild(loader);

  try {
    const res = await fetch(
      `https://epaper.patrika.com/Home/getStoriesOnPage?pageid=${page.PageId}`
    );
    const stories = await res.json();

    loader.remove();

    stories.forEach((story) => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <img src="${story.LinkPicture}" alt="${story.storyTitle}" />
        <div class="card-content">
          <h2>${story.storyTitle}</h2>
          <p>${story.Content || story.Summary || ""}</p>
        </div>
      `;
      card.addEventListener("click", () => {
        window.location.href = `story.html?OrgId=${story.OrgId}`;
      });
      storyList.appendChild(card);
    });

    currentPageIndex++;
    isLoading = false;

    if (document.body.scrollHeight <= window.innerHeight) {
      loadNextPageStories(currentPageIndex);
    }
  } catch (err) {
    console.error(err);
    loader.textContent = "Failed to load this page.";
    isLoading = false;
  }
}

// Infinite scroll
window.addEventListener("scroll", () => {
  if (
    window.innerHeight + window.scrollY >=
    document.body.offsetHeight - 200
  ) {
    loadNextPageStories();
  }
});

init();