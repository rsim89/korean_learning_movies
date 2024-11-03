// === Asset and Directory Configurations ===
const BASE_DIRECTORY = "images"; 
let currentEpisodeNum = 1;
let SEGMENTS_DIR = `https://rsim89.github.io/korean_learning_movies_Episode_${String(currentEpisodeNum).padStart(2, '0')}/segments`;
const SUBTITLES_DIR = "subtitles";

// Define All Image Paths
const IMAGES = {
    koreanIcon: `${BASE_DIRECTORY}/korean.svg`,
    englishIcon: `${BASE_DIRECTORY}/english.svg`,
    subtitleOnIcon: `${BASE_DIRECTORY}/subtitleon.svg`,
    subtitleOffIcon: `${BASE_DIRECTORY}/subtitleoff.svg`,
    elaborationOnIcon: `${BASE_DIRECTORY}/elaborationon.svg`,
    elaborationOffIcon: `${BASE_DIRECTORY}/elaborationoff.svg`,
};

// === Modes and Playback Settings ===
const modes = ["Korean only", "Korean+English"];
let currentModeIndex = 0;
let isPlayingSegments = false;
let isElaborationOn = false;
let isSubtitleHighlighted = false;
let currentPlaybackStartIndex = 1;  // Default starting segment index
let currentPlaybackSegmentCount = 5;  // Default segment count to play

// === Global Elements ===
const videoPlayer = document.getElementById("video-player");
const subtitleBlocksContainer = document.getElementById('subtitle-blocks');
const toggleModeButton = document.getElementById("toggle-mode-button");
const episodeSelect = document.getElementById('episode-select');
const startButton = document.getElementById("start-button");
const searchButton = document.getElementById("search-button");
const searchInput = document.getElementById("search-input");
const searchResultsContainer = document.getElementById("search-results-container");
const searchPopup = document.getElementById("search-results");
const showHighlightedButton = document.getElementById("show-highlighted-popup");
const segmentCountInput = document.getElementById("segment-count");
const startIndexInput = document.getElementById("start-index");
const endIndexInput = document.getElementById("end-index");

// === Subtitle Data Storage ===
const allEpisodesSubtitles = {};

// === Utility Functions ===
function getSegmentCount() {
    return parseInt(segmentCountInput.value, 10) || 1;
}

// === Subtitle Loading and Parsing ===
async function loadAllEpisodesSubtitles() {
    for (let ep = 1; ep <= 16; ep++) {
        const episodeKey = `Episode_${String(ep).padStart(2, '0')}`;
        const koreanSubtitleFile = `${SUBTITLES_DIR}/Goblin_S01E${String(ep).padStart(2, '0')}_Korean.srt`;
        const englishSubtitleFile = koreanSubtitleFile.replace("_Korean.srt", "_Korean.en.srt");

        try {
            const koreanData = await fetch(koreanSubtitleFile).then(res => res.text());
            const englishData = await fetch(englishSubtitleFile).then(res => res.text());
            allEpisodesSubtitles[episodeKey] = {
                korean: parseSRT(koreanData),
                english: parseSRT(englishData),
            };
        } catch (error) {
            console.error(`Error loading subtitles for ${episodeKey}:`, error);
        }
    }
}

function parseSRT(data) {
    return data.split(/\r?\n\r?\n/).map(block => {
        const lines = block.trim().split(/\r?\n/);
        return { timestamp: lines[1], text: lines.slice(2).join(' ') };
    });
}

// === Display Subtitles ===
function displayEpisodeSubtitles(episodeNum, segmentIndex = 0) {
    subtitleBlocksContainer.innerHTML = ''; 
    const episodeKey = `Episode_${String(episodeNum).padStart(2, '0')}`;
    const { korean, english } = allEpisodesSubtitles[episodeKey] || { korean: [], english: [] };
    const segmentCount = getSegmentCount();

    korean.slice(segmentIndex, segmentIndex + segmentCount).forEach((sub, i) => {
        const subtitleDiv = document.createElement("div");
        subtitleDiv.classList.add("subtitle-block");

        subtitleDiv.dataset.episodeNum = episodeNum;
        subtitleDiv.dataset.segmentIndex = segmentIndex + i + 1;

        subtitleDiv.innerHTML = `
            <div class="index-box">Ep ${episodeNum} - ${segmentIndex + i + 1} | ${sub.timestamp}</div>
            <div class="korean-box">${sub.text}</div>
            <div class="english-box" style="display: ${modes[currentModeIndex] === "Korean+English" ? 'block' : 'none'};">
                ${english[segmentIndex + i] ? english[segmentIndex + i].text : ''}
            </div>
        `;

        subtitleDiv.addEventListener("click", () => {
            videoPlayer.pause();
            videoPlayer.currentTime = 0;
            videoPlayer.onended = null;
            updateSegmentsDir(parseInt(subtitleDiv.dataset.episodeNum, 10));
            playSegments(parseInt(subtitleDiv.dataset.episodeNum, 10), parseInt(subtitleDiv.dataset.segmentIndex, 10), parseInt(segmentCountInput.value, 10));
        });

        subtitleBlocksContainer.appendChild(subtitleDiv);
    });
}

function updateDisplayEpisodeSubtitles(episodeNum, startSegment, count) {
    subtitleBlocksContainer.innerHTML = '';  
    const episodeKey = `Episode_${String(episodeNum).padStart(2, '0')}`;
    const { korean, english } = allEpisodesSubtitles[episodeKey] || { korean: [], english: [] };
    const endSegment = startSegment + count - 1;

    korean.slice(startSegment - 1, endSegment).forEach((sub, i) => {
        const subtitleDiv = document.createElement("div");
        subtitleDiv.classList.add("subtitle-block");

        subtitleDiv.dataset.episodeNum = episodeNum;
        subtitleDiv.dataset.segmentIndex = startSegment + i;

        subtitleDiv.innerHTML = `
            <div class="index-box">Ep ${episodeNum} - ${startSegment + i} | ${sub.timestamp}</div>
            <div class="korean-box">${sub.text}</div>
            <div class="english-box" style="display: ${modes[currentModeIndex] === "Korean+English" ? 'block' : 'none'};">
                ${english[startSegment + i - 1] ? english[startSegment + i - 1].text : ''}
            </div>
        `;

        subtitleDiv.addEventListener("click", () => {
            videoPlayer.pause();
            videoPlayer.currentTime = 0;
            videoPlayer.onended = null;
            updateSegmentsDir(parseInt(subtitleDiv.dataset.episodeNum, 10));
            playSegments(parseInt(subtitleDiv.dataset.episodeNum, 10), parseInt(subtitleDiv.dataset.segmentIndex, 10), parseInt(segmentCountInput.value, 10));
        });

        subtitleBlocksContainer.appendChild(subtitleDiv);
    });
}

// === Playback Control ===
function playSegments(episodeNum, segmentIndex, count) {
    currentEpisodeNum = episodeNum;
    currentPlaybackSegmentCount = count;
    isPlayingSegments = true;
    currentPlaybackStartIndex = parseInt(segmentIndex, 10);
    const segmentFiles = Array.from({ length: count }, (_, i) => 
        `${SEGMENTS_DIR}/Episode_${String(episodeNum).padStart(2, '0')}/segment_${String(currentPlaybackStartIndex + i).padStart(3, '0')}.mp4`
    );

    let currentSegment = 0;
    function playNextSegment() {
        if (currentSegment < segmentFiles.length) {
            videoPlayer.src = segmentFiles[currentSegment];
            videoPlayer.play().catch(err => console.error('Error playing video:', err));
            currentSegment++;
            videoPlayer.onended = playNextSegment;
            updateDisplayEpisodeSubtitles(episodeNum, parseInt(segmentIndex) + currentSegment - 1, count);
        } else {
            isPlayingSegments = false;
        }
    }
    playNextSegment();
}

// === Search Functionality ===
searchButton.addEventListener("click", () => {
    const searchTerm = searchInput.value.toLowerCase().trim();
    searchResultsContainer.innerHTML = '';
    const segmentCount = parseInt(getSegmentCount(), 10);

    if (!searchTerm) {
        const episodeNum = parseInt(episodeSelect.value, 10);
        const episodeKey = `Episode_${String(episodeNum).padStart(2, '0')}`;
        const episodeSubtitles = allEpisodesSubtitles[episodeKey];

        if (episodeSubtitles) {
            episodeSubtitles.korean.slice(0, 20).forEach((koreanSubtitle, index) => {
                const englishSubtitle = episodeSubtitles.english[index];
                const div = document.createElement("div");
                div.className = "search-result";

                div.innerHTML = `
                    <strong>Episode ${episodeNum} - ${index + 1}</strong>: 
                    <div>${koreanSubtitle.text}</div>
                    <div>${englishSubtitle ? englishSubtitle.text : ''}</div>
                `;
                div.dataset.index = (index + 1).toString();
                div.dataset.episode = episodeNum.toString();

                div.addEventListener("click", () => {
                    videoPlayer.pause();
                    videoPlayer.currentTime = 0;
                    videoPlayer.onended = null;
                    updateSegmentsDir(parseInt(div.dataset.episode, 10));
                    playSegments(parseInt(div.dataset.episode, 10), parseInt(div.dataset.index, 10), segmentCount);
                    togglePopup();
                });

                searchResultsContainer.appendChild(div);
            });
            togglePopup();
        } else {
            searchResultsContainer.innerHTML = '<div>No subtitles found for the selected episode.</div>';
        }
        return;
    }

    const regexPattern = searchTerm.replace(/\*/g, '.*');
    const searchRegex = new RegExp(regexPattern, 'i');

    const searchResults = [];
    Object.keys(allEpisodesSubtitles).forEach(episodeKey => {
        const episodeSubtitles = allEpisodesSubtitles[episodeKey];
        const episodeNumber = parseInt(episodeKey.split('_')[1], 10);

        const filteredSubtitles = episodeSubtitles.korean.map((koreanSubtitle, index) => {
            const englishSubtitle = episodeSubtitles.english[index];
            return {
                episode: episodeNumber,
                index: index + 1,
                koreanText: koreanSubtitle.text,
                englishText: englishSubtitle ? englishSubtitle.text : ""
            };
        }).filter(subtitle =>
            searchRegex.test(subtitle.koreanText) || searchRegex.test(subtitle.englishText)
        );

        searchResults.push(...filteredSubtitles);
    });

    searchResults.forEach(subtitle => {
        const div = document.createElement("div");
        div.className = "search-result";

        div.innerHTML = `
            <strong>Episode ${subtitle.episode} - ${subtitle.index}</strong>: 
            <div>${subtitle.koreanText}</div>
            <div>${subtitle.englishText ? subtitle.englishText : ''}</div>
        `;
        div.dataset.index = subtitle.index.toString();
        div.dataset.episode = subtitle.episode.toString();

        div.addEventListener("click", () => {
            videoPlayer.pause();
            videoPlayer.currentTime = 0;
            videoPlayer.onended = null;
            updateSegmentsDir(parseInt(div.dataset.episode, 10));
            playSegments(parseInt(div.dataset.episode, 10), parseInt(div.dataset.index, 10), segmentCount);
            updateDisplayEpisodeSubtitles(parseInt(div.dataset.episode, 10), parseInt(div.dataset.index, 10), segmentCount);
            togglePopup();
        });

        searchResultsContainer.appendChild(div);
    });

    if (!searchResults.length) {
        searchResultsContainer.innerHTML = '<div>No subtitles found.</div>';
    }
    togglePopup();
});

// === Toggle Functions ===
function togglePopup() {
    searchPopup.style.display = searchPopup.style.display === 'block' ? 'none' : 'block';
}

function toggleSubtitleMode() {
    currentModeIndex = (currentModeIndex + 1) % modes.length;
    const icon = modes[currentModeIndex] === "Korean only" ? IMAGES.koreanIcon : IMAGES.englishIcon;
    toggleModeButton.querySelector("img").src = icon;

    const subtitleBlocks = subtitleBlocksContainer.querySelectorAll(".subtitle-block");
    subtitleBlocks.forEach(block => {
        const englishBox = block.querySelector(".english-box");
        if (englishBox) {
            englishBox.style.display = modes[currentModeIndex] === "Korean+English" ? "block" : "none";
        }
    });
}

function toggleSubtitleHighlight() {
    isSubtitleHighlighted = !isSubtitleHighlighted;
    showHighlightedButton.querySelector("img").src = isSubtitleHighlighted ? IMAGES.subtitleOnIcon : IMAGES.subtitleOffIcon;
    subtitleBlocksContainer.style.display = isSubtitleHighlighted ? 'block' : 'none';
}

// === Event Listeners ===
segmentCountInput.addEventListener("input", () => {
    const segmentCount = getSegmentCount();
    updateDisplayEpisodeSubtitles(currentEpisodeNum, currentPlaybackStartIndex, segmentCount);
});

showHighlightedButton.addEventListener("click", toggleSubtitleHighlight);
toggleModeButton.addEventListener("click", toggleSubtitleMode);
episodeSelect.addEventListener("change", () => {
    currentEpisodeNum = parseInt(episodeSelect.value, 10);
    displayEpisodeSubtitles(currentEpisodeNum, 0);
});

document.addEventListener("DOMContentLoaded", () => {
    loadAllEpisodesSubtitles().then(() => {
        episodeSelect.value = "1";
        displayEpisodeSubtitles(1);
    });
});

document.getElementById('reset-button').addEventListener('click', () => {
    location.reload();
});


episodeSelect.addEventListener('change', function () {
    const episodeNum = this.value;
    document.getElementById('episode-number').textContent = episodeNum;
    displayEpisodeSubtitles(episodeNum);
});

startButton.addEventListener("click", () => {
    const startIndex = parseInt(startIndexInput.value, 10);
    const endIndex = parseInt(endIndexInput.value, 10);
    const episodeNum = parseInt(episodeSelect.value, 10);

    if (!isNaN(startIndex) && !isNaN(endIndex) && endIndex >= startIndex) {
        videoPlayer.pause();
        videoPlayer.currentTime = 0;
        videoPlayer.onended = null;

        const segmentCount = endIndex - startIndex + 1;
        updateSegmentsDir(episodeNum);
        playSegments(episodeNum, startIndex, segmentCount);
        updateDisplayEpisodeSubtitles(episodeNum, startIndex, segmentCount);
    } else {
        alert("Please enter valid Start and End indices.");
    }
});

// === Elaboration Toggle and Translation ===
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("toggle-elaboration-button").addEventListener("click", () => {
        isElaborationOn = !isElaborationOn;

        const elaborationImage = document.getElementById("toggle-elaboration-button").querySelector("img");
        elaborationImage.src = isElaborationOn ? IMAGES.elaborationOnIcon : IMAGES.elaborationOffIcon;
        elaborationImage.alt = isElaborationOn ? "Show Elaboration" : "Hide Elaboration";

        if (isElaborationOn) {
            const koreanText = fetchCurrentKoreanText(currentEpisodeNum, currentPlaybackStartIndex, currentPlaybackSegmentCount);
            const googleTranslateURL = `https://translate.google.com/?sl=ko&tl=en&text=${encodeURIComponent(koreanText)}&op=translate`;
            window.open(googleTranslateURL, "_blank");
        }
    });
});

function fetchCurrentKoreanText(episodeNum, startSegment, segmentCount) {
    const episodeKey = `Episode_${String(episodeNum).padStart(2, '0')}`;
    const { korean } = allEpisodesSubtitles[episodeKey] || { korean: [] };

    return korean.slice(startSegment - 1, startSegment - 1 + segmentCount).map(sub => sub.text).join(' ');
}

// Function to update SEGMENTS_DIR when currentEpisodeNum changes
function updateSegmentsDir(newEpisodeNum) {
    currentEpisodeNum = newEpisodeNum;
    SEGMENTS_DIR = `https://rsim89.github.io/korean_learning_movies_Episode_${String(currentEpisodeNum).padStart(2, '0')}/segments`;
}
