let pages = [];
let currentPageIndex = 0;
let isLoading = false;
let allPagesFetchedForSearch = false;

const searchToggle = document.getElementById("search-toggle");
const searchInput = document.getElementById("search-input");
const searchClear = document.getElementById("search-clear");

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

  const ignoreTexts = [
    "८ राज्य,  ३८ संस्करण",
    "य एषु सुप्तेषु जागर्ति",
    "क्क संवत्सर का नाम"
  ].map(t => t.trim());

  try {
    const res = await fetch(
      `https://epaper.patrika.com/Home/getStoriesOnPage?pageid=${page.PageId}`
    );
    const stories = await res.json();

    loader.remove();

    // ✅ Skip entire page if it has only one story
    if (stories.length <= 1) {
      console.log(`Skipping Page ${page.PageNo} (only one story)`);
      currentPageIndex++;
      isLoading = false;
      loadNextPageStories(); // load next automatically
      return;
    }

    // ✅ Filter out unwanted stories based on ignoreTexts
    const filteredStories = stories.filter(story => {
      const title = (story.storyTitle || "").trim();
      const content = (story.Content || story.Summary || "").trim();

      return !ignoreTexts.some(ignoreText =>
        title.includes(ignoreText) || content.includes(ignoreText)
      );
    });

    // ✅ Append only filtered stories
    filteredStories.forEach((story) => {
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

    // Load next page if viewport still empty
    if (document.body.scrollHeight <= window.innerHeight) {
      loadNextPageStories();
    }
  } catch (err) {
    console.error(err);
    loader.textContent = "Failed to load this page.";
    isLoading = false;
  }
}

// Helper: render a single story card (used by search results too)
function createStoryCard(story) {
  const card = document.createElement("div");
  card.className = "card";
  card.dataset.title = (story.storyTitle || "").toLowerCase();
  const contentText = (story.Content || story.Summary || "").toString();
  card.dataset.content = contentText.toLowerCase();
  card.innerHTML = `
    <img src="${story.LinkPicture}" alt="${story.storyTitle}" />
    <div class="card-content">
      <h2>${story.storyTitle}</h2>
      <p>${contentText}</p>
    </div>
  `;
  card.addEventListener("click", () => {
    window.location.href = `story.html?OrgId=${story.OrgId}`;
  });
  return card;
}

// Ensure all remaining pages are fetched (used for search when not fully loaded)
async function fetchAllRemainingPages() {
  if (allPagesFetchedForSearch) return;
  while (currentPageIndex < pages.length) {
    try {
      isLoading = true;
      const page = pages[currentPageIndex];
      const res = await fetch(
        `https://epaper.patrika.com/Home/getStoriesOnPage?pageid=${page.PageId}`
      );
      const stories = await res.json();
      stories.forEach((s) => {
        const card = createStoryCard(s);
        storyList.appendChild(card);
      });
      currentPageIndex++;
    } catch (err) {
      console.error('Error fetching page during full fetch', err);
      break;
    } finally {
      isLoading = false;
    }
  }
  allPagesFetchedForSearch = true;
}

// Search/filter displayed cards by query
function filterStories(query) {
  const q = (query || "").trim().toLowerCase();
  const cards = Array.from(storyList.querySelectorAll('.card'));
  if (!q) {
    // show all cards
    cards.forEach(c => (c.style.display = ''));
    return;
  }
  cards.forEach((c) => {
    const title = c.dataset.title || '';
    const content = c.dataset.content || '';
    if (title.includes(q) || content.includes(q)) {
      c.style.display = '';
    } else {
      c.style.display = 'none';
    }
  });
}

// UI: open/close search input
if (searchToggle && searchInput && searchClear) {
  searchToggle.addEventListener('click', async () => {
    const isOpen = searchInput.classList.toggle('open');
    if (isOpen) {
      searchInput.focus();
    } else {
      searchInput.value = '';
      filterStories('');
    }
  });

  searchClear.addEventListener('click', (e) => {
    e.stopPropagation();
    searchInput.value = '';
    searchInput.classList.remove('open');
    filterStories('');
  });

  let searchTimeout = null;
  searchInput.addEventListener('input', async (e) => {
    const q = e.target.value;
    // Debounce
    if (searchTimeout) clearTimeout(searchTimeout);
    searchTimeout = setTimeout(async () => {
      if (!q) {
        filterStories('');
        return;
      }
      // If not all pages fetched, fetch them so search covers whole set
      if (!allPagesFetchedForSearch && currentPageIndex < pages.length) {
        await fetchAllRemainingPages();
      }
      filterStories(q);
    }, 250);
  });
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

let isReading = false;
let currentStoryIndex = 0;
let storyCards = [];

function startReading() {
  if (isReading) return;
  storyCards = Array.from(document.querySelectorAll("#story-list .card"));
  if (storyCards.length === 0) {
    alert("No stories to read.");
    return;
  }

  isReading = true;
  readAloudBtn.textContent = "⏸️";
  currentStoryIndex = 0;
  readNextStory();
}

function readNextStory() {
  if (!isReading || currentStoryIndex >= storyCards.length) {
    stopReading();
    alert("✅ Finished reading all stories!");
    return;
  }

  const card = storyCards[currentStoryIndex];
  const title = card.querySelector("h2")?.innerText || "";
  const content = card.querySelector("p")?.innerText || "";

  card.scrollIntoView({ behavior: "smooth", block: "center" });

  const textToRead = `${title}. ${content}`;
  const utterance = new SpeechSynthesisUtterance(textToRead);
  utterance.lang = "hi-IN"; // Hindi
  utterance.rate = 0.95;

  utterance.onend = () => {
    currentStoryIndex++;
    setTimeout(readNextStory, 800);
  };

  window.speechSynthesis.speak(utterance);
}

function stopReading() {
  window.speechSynthesis.cancel();
  isReading = false;
  readAloudBtn.textContent = "▶️";
}

const readAloudBtn = document.getElementById("read-aloud-btn");
if (readAloudBtn) {
  readAloudBtn.addEventListener("click", () => {
    if (!isReading) {
      startReading();
    } else {
      stopReading();
    }
  });
}