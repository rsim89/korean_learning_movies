// Define the base directory globally
const BASE_DIRECTORY = "/korean_learning_movie";

// Define all image paths at the beginning
const IMAGES = {
    koreanIcon: `${BASE_DIRECTORY}/images/korean.svg`,
    englishIcon: `${BASE_DIRECTORY}/images/english.svg`,
    subtitleOnIcon: `${BASE_DIRECTORY}/images/subtitleon.svg`,
    subtitleOffIcon: `${BASE_DIRECTORY}/images/subtitleoff.svg`,
    elaborationOnIcon: `${BASE_DIRECTORY}/images/elaborationon.svg`,
    elaborationOffIcon: `${BASE_DIRECTORY}/images/elaborationoff.svg`,
};

// Initial setup for mode and icons
const modes = ["Korean only", "Korean+English"];
let currentModeIndex = 0;
let mode = modes[currentModeIndex]; // Set initial mode
let currentEpisodeNum = null; // Track the currently playing episode number

// Define elements globally so they are accessible throughout the script
const popupContainer = document.getElementById("popup-subtitle-container");
const toggleModeButton = document.getElementById("toggle-mode-button");
const videoPlayer = document.getElementById("video-player");
const subtitleBlocksContainer = document.getElementById("subtitle-blocks");
const searchInput = document.getElementById("search-input");
const searchButton = document.getElementById("search-button");
const segmentCountInput = document.getElementById("segment-count");
const startIndexInput = document.getElementById("start-index");
const endIndexInput = document.getElementById("end-index");
const startButton = document.getElementById("start-button");
const searchResultsContainer = document.getElementById("search-results-container");
const searchPopup = document.getElementById("search-results");
const showHighlightedButton = document.getElementById("show-highlighted-popup");
const episodeSelect = document.getElementById('episode-select');
const searchResultsPopup = document.getElementById("search-results");
const dragHandle = document.getElementById("drag-handle");
const allEpisodesSubtitles = {};

// Global state variable for elaboration toggle
let offsetX = 0, offsetY = 0, startX = 0, startY = 0;
let isElaborationOn = false;
let koreanSubtitles = [];
let englishSubtitles = [];
let segmentDirectory = ""; // Declare segmentDirectory in the global scope
let isSubtitleHighlighted = false; // Track if highlighted subtitles are shown
toggleModeButton.querySelector("img").src = IMAGES.koreanIcon; // Set initial mode icon

document.addEventListener("DOMContentLoaded", () => {
    const episodeSelect = document.getElementById('episode-select');
    // Your code using episodeSelect here
});

// Function to load subtitles for all episodes and return a promise
function loadAllEpisodesSubtitles() {
    const totalEpisodes = 16; // Update this to the total number of episodes
    const subtitlePromises = [];

    for (let episodeNum = 1; episodeNum <= totalEpisodes; episodeNum++) {
        const episodeKey = `Episode_${String(episodeNum).padStart(2, '0')}`;
        const koreanSubtitleFile = `Goblin_S01E${String(episodeNum).padStart(2, '0')}_Korean.srt`;
        const englishSubtitleFile = koreanSubtitleFile.replace("_Korean.srt", "_Korean.en.srt");

        // Add each fetch chain as a promise to the array
        const subtitlePromise = fetch(koreanSubtitleFile)
            .then(response => {
                if (!response.ok) throw new Error(`Failed to fetch Korean subtitles for episode ${episodeNum}`);
                return response.text();
            })
            .then(data => {
                const koreanSubtitles = parseSRT(data);
                return fetch(englishSubtitleFile)
                    .then(response => {
                        if (!response.ok) throw new Error(`Failed to fetch English subtitles for episode ${episodeNum}`);
                        return response.text();
                    })
                    .then(data => {
                        const englishSubtitles = parseSRT(data);
                        // Store both Korean and English subtitles for this episode
                        allEpisodesSubtitles[episodeKey] = { korean: koreanSubtitles, english: englishSubtitles };
                    });
            })
            .catch(error => console.error(error.message));

        subtitlePromises.push(subtitlePromise);
    }

    // Return a promise that resolves when all subtitles are loaded
    return Promise.all(subtitlePromises);
}

// Function to display subtitles for a selected episode
function displayEpisodeSubtitles(episodeNum, segmentNumber = 1) {
    // Construct the path to the segment file based on the episode number and segment number
    const segmentFilePath = `segments/Episode_${String(episodeNum).padStart(2, '0')}/segment_${String(segmentNumber).padStart(3, '0')}.mp4`;
    videoPlayer.src = segmentFilePath;  // Set the video source to this segment file
    
    const episodeKey = `Episode_${String(episodeNum).padStart(2, '0')}`;
    const episodeSubtitles = allEpisodesSubtitles[episodeKey];
	

    if (episodeSubtitles) {
        koreanSubtitles = episodeSubtitles.korean;
        englishSubtitles = episodeSubtitles.english;

        subtitleBlocksContainer.innerHTML = ''; // Clear existing blocks
        koreanSubtitles.forEach(sub => createSubtitleBlock(sub.subtitleIndex));
        addClickListeners(); // Add listeners after rendering
    } else {
        console.error(`Subtitles for episode ${episodeNum} are not loaded.`);
        subtitleBlocksContainer.innerHTML = '<div>Failed to load subtitles.</div>';
    }
}

// Load all episode subtitles once the page is loaded and display episode 1 as default
document.addEventListener("DOMContentLoaded", () => {
    loadAllEpisodesSubtitles()
        .then(() => {
            // Set default episode to 1 in the dropdown and display area
            episodeSelect.value = "1";
            document.getElementById('episode-number').textContent = "1";

            // Display subtitles for episode 1
            displayEpisodeSubtitles(1);
        })
        .catch(error => console.error('Failed to load all episodes subtitles:', error));
});

// Event listener to update displayed subtitles on episode change
episodeSelect.addEventListener('change', function () {
    const episodeNum = this.value;
    document.getElementById('episode-number').textContent = episodeNum;
    displayEpisodeSubtitles(episodeNum);
});

// Define parseSRT globally
function parseSRT(data) {
    const subtitles = [];
    const blocks = data.split(/\r?\n\r?\n/);
    blocks.forEach((block) => {
        const lines = block.trim().split(/\r?\n/);
        if (lines.length < 3) return;

        const subtitleIndex = parseInt(lines[0], 10);
        const timestamp = lines[1];
        const subtitleText = lines.slice(2).join(' ').trim();

        if (!isNaN(subtitleIndex) && timestamp.includes('-->') && subtitleText) {
            subtitles.push({ subtitleIndex, timestamp, text: subtitleText });
        }
    });
    return subtitles;
}

toggleModeButton.addEventListener("click", () => {
    currentModeIndex = (currentModeIndex + 1) % modes.length;
    mode = modes[currentModeIndex];

    // Update button icon and alt text based on the current mode
    const modeImage = toggleModeButton.querySelector("img");
    modeImage.src = mode === "Korean only" ? IMAGES.koreanIcon : IMAGES.englishIcon;
    modeImage.alt = mode === "Korean only" ? "Mode: Korean only" : "Mode: Korean + English";

    // Toggle visibility of English text boxes based on the selected mode
    const subtitleBlocks = subtitleBlocksContainer.querySelectorAll(".subtitle-block");
    subtitleBlocks.forEach((block) => {
        const englishBox = block.querySelector(".english-box");
        if (englishBox) {
            englishBox.style.display = mode === "Korean+English" ? "block" : "none";
        }
    });

    // Update main displayed subtitles and popup subtitles (if open) to reflect the new mode
    const episodeNum = currentEpisodeNum;
    updateDisplayedSubtitles(episodeNum, currentPlaybackStartIndex, currentPlaybackSegmentCount, startIndexHighlighted);

    if (popupContainer && popupContainer.style.display === 'block') {
        updatePopupWithAllSubtitles(episodeNum, currentPlaybackStartIndex, currentPlaybackSegmentCount);
    }
});

function createSubtitleBlock(subtitleIndex) {
    const div = document.createElement("div");
    div.className = "subtitle-block";

    // Create index box with episode number and timestamp
    const episodeSelect = document.getElementById('episode-select');
    const episodeNum = episodeSelect.value; // Get the selected episode number
    const indexBox = document.createElement("div");
    indexBox.className = "index-box";
    const timestamp = koreanSubtitles[subtitleIndex - 1]?.timestamp || "";
    indexBox.textContent = `Ep ${episodeNum} - ${subtitleIndex} | ${timestamp}`;
    div.appendChild(indexBox);

    // Korean subtitle text
    const koreanText = koreanSubtitles[subtitleIndex - 1]?.text || "";
    const koreanBox = document.createElement("div");
    koreanBox.className = "korean-box";
    koreanBox.textContent = koreanText;

    // Optional English subtitle text in "Korean+English" mode
    if (mode === "Korean+English") {
        const englishText = englishSubtitles[subtitleIndex - 1]?.text || "";
        const englishBox = document.createElement("div");
        englishBox.className = "english-box";
        englishBox.textContent = englishText;

        div.appendChild(koreanBox);
        div.appendChild(englishBox);
    } else {
        div.appendChild(koreanBox);
    }

    div.dataset.index = subtitleIndex;
    subtitleBlocksContainer.appendChild(div);
}



startButton.addEventListener("click", () => {
    const startIndex = parseInt(startIndexInput.value, 10);
    const endIndex = parseInt(endIndexInput.value, 10);

    if (!isNaN(startIndex) && !isNaN(endIndex) && endIndex >= startIndex) {
        stopPlayback();
        playSegments(startIndex, endIndex - startIndex + 1);
        updateDisplayedSubtitles(startIndex, endIndex - startIndex + 1);
    } else {
        alert("Please enter valid Start and End indices.");
    }
});

showHighlightedButton.addEventListener("click", () => {
    isSubtitleHighlighted = !isSubtitleHighlighted;

    const subtitleImage = showHighlightedButton.querySelector("img");
    const subtitleBlocksContainer = document.getElementById("subtitle-blocks");

    subtitleImage.src = isSubtitleHighlighted ? IMAGES.subtitleOnIcon : IMAGES.subtitleOffIcon;
    subtitleImage.alt = isSubtitleHighlighted ? "Show Highlighted Subtitles" : "Hide Highlighted Subtitles";
    subtitleBlocksContainer.style.display = isSubtitleHighlighted ? 'block' : 'none';
});

// Function to play segments for a specific episode
function playSegments(episodeNum, startIndex, count) {
    currentEpisodeNum = episodeNum;
    currentPlaybackStartIndex = startIndex;
    currentPlaybackSegmentCount = count;
    currentPlaybackSegment = 0;
    startIndexHighlighted = false;
    isPlayingSegments = true;

    const segmentFiles = Array.from({ length: count }, (_, i) => 
        `segments/Episode_${String(episodeNum).padStart(2, '0')}/segment_${String(startIndex + i).padStart(3, '0')}.mp4`
    );

    let currentSegment = 0;

    const playNextSegment = () => {
        if (currentSegment < segmentFiles.length) {
            currentPlaybackSegment = currentSegment;
            const segmentFile = segmentFiles[currentSegment];
            videoPlayer.src = segmentFile;
            videoPlayer.load();

            videoPlayer.addEventListener("canplay", () => {
                videoPlayer.play().catch(error => console.error('Error playing the video:', error));
            }, { once: true });

            const currentIndex = startIndex + currentSegment;
            updateDisplayedSubtitles(episodeNum, currentPlaybackStartIndex, currentPlaybackSegmentCount, startIndexHighlighted);
            updatePopupWithAllSubtitles(currentEpisodeNum, currentPlaybackStartIndex, currentPlaybackSegmentCount, startIndexHighlighted);

            currentSegment++;
            videoPlayer.addEventListener('ended', playNextSegment, { once: true });
        } else {
            isPlayingSegments = false;
        }
    };

    playNextSegment();
}

function stopPlayback() {
    videoPlayer.pause();
    videoPlayer.src = "";
    isPlayingSegments = false;
}

function updateDisplayedSubtitles(episodeNum, currentPlaybackStartIndex, currentPlaybackSegmentCount, startIndexHighlighted) {
    const startIndex = parseInt(currentPlaybackStartIndex, 10);
    const segmentCount = parseInt(currentPlaybackSegmentCount, 10);
    const episodeKey = `Episode_${String(episodeNum).padStart(2, '0')}`;
    const episodeSubtitles = allEpisodesSubtitles[episodeKey];
    
    if (!episodeSubtitles) return;

    // Clear previous subtitles
    subtitleBlocksContainer.innerHTML = '';

    const end = Math.min(episodeSubtitles.korean.length - 1, startIndex + segmentCount - 2);

    for (let i = startIndex - 1; i <= end; i++) {
        const koreanSubtitle = episodeSubtitles.korean[i];
        const englishSubtitle = episodeSubtitles.english[i];
        const div = document.createElement("div");
        div.className = "subtitle-block";
        div.dataset.index = i + 1;

        // Timestamp display
        const indexBox = document.createElement("div");
        indexBox.className = "index-box";
        indexBox.textContent = `${i + 1} | ${koreanSubtitle.timestamp}`;
        div.appendChild(indexBox);

        // Korean subtitle text
        const koreanBox = document.createElement("div");
        koreanBox.className = "korean-box";
        koreanBox.textContent = koreanSubtitle.text;
        div.appendChild(koreanBox);

        // Optional English subtitle text
        if (mode === "Korean+English" && englishSubtitle) {
            const englishBox = document.createElement("div");
            englishBox.className = "english-box";
            englishBox.textContent = englishSubtitle.text;
            div.appendChild(englishBox);
        }

        // Set visibility based on whether this block matches the current segment
        if (i + 1 === startIndex) {
            div.style.display = "block"; // Show the current segment's subtitle block
            div.classList.add("highlighted-subtitle");
            div.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
            div.style.display = "none"; // Hide other subtitle blocks
        }

        // Append each subtitle block to the container
        subtitleBlocksContainer.appendChild(div);
    }
}

function addClickListeners() {
    subtitleBlocksContainer.addEventListener("click", (event) => {
        const block = event.target.closest(".subtitle-block");
        if (block) {
            const startIndex = parseInt(block.dataset.index, 10);
            let segmentCount = parseInt(segmentCountInput.value, 10);
            if (isNaN(segmentCount) || segmentCount < 1) segmentCount = 1; // Default to 1 if input is invalid

            // Retrieve episode number from the dropdown
            const episodeNum = parseInt(episodeSelect.value, 10);

            // Stop any ongoing playback
            stopPlayback();

            // Play the selected segment range for the specified episode
            playSegments(episodeNum, startIndex, segmentCount);

            // Update the displayed subtitles for the selected segment range
            updateDisplayedSubtitles(episodeNum, startIndex, segmentCount, false);

            // Update or hide popup based on elaboration mode
            if (isElaborationOn) {
                updatePopupWithAllSubtitles(episodeNum, startIndex, segmentCount, false);
            } else {
                const popupContainer = document.getElementById("popup-subtitle-container");
                if (popupContainer) {
                    popupContainer.style.display = 'none';
                }
            }
        }
    });
}

// Reload the page on reset button click
document.getElementById('reset-button').addEventListener('click', () => {
    location.reload();
});

// Update displayed subtitles for a specific episode segment
function updateDisplayedSubtitles(episodeNum, currentPlaybackStartIndex, currentPlaybackSegmentCount, startIndexHighlighted) {
    const startIndex = parseInt(currentPlaybackStartIndex, 10);
    const segmentCount = parseInt(currentPlaybackSegmentCount, 10);
    const episodeKey = `Episode_${String(episodeNum).padStart(2, '0')}`;
    const episodeSubtitles = allEpisodesSubtitles[episodeKey];

    if (!episodeSubtitles) return;

    subtitleBlocksContainer.innerHTML = '';  // Clear previous subtitles

    const currentIndex = startIndex + currentPlaybackSegment - 1;

    if (currentIndex >= 0 && currentIndex < episodeSubtitles.korean.length) {
        const koreanSubtitle = episodeSubtitles.korean[currentIndex];
        const englishSubtitle = episodeSubtitles.english[currentIndex];

        const subtitleDiv = document.createElement("div");
        subtitleDiv.className = "subtitle-block";
        subtitleDiv.dataset.index = currentIndex + 1; // Keep dataset.index as currentIndex only

        // Display episode number, index, and timestamp
        const indexBox = document.createElement("div");
        indexBox.className = "index-box";
        indexBox.textContent = `Ep ${episodeNum} - ${currentIndex + 1} | ${koreanSubtitle.timestamp}`;
        subtitleDiv.appendChild(indexBox);

        // Korean subtitle text
        const koreanBox = document.createElement("div");
        koreanBox.className = "korean-box";
        koreanBox.textContent = koreanSubtitle.text;
        subtitleDiv.appendChild(koreanBox);

        // Optional English subtitle text in "Korean+English" mode
        if (mode === "Korean+English" && englishSubtitle) {
            const englishBox = document.createElement("div");
            englishBox.className = "english-box";
            englishBox.textContent = englishSubtitle.text;
            subtitleDiv.appendChild(englishBox);
        }

        // Highlight and center the subtitle block
        subtitleDiv.classList.add("highlighted-subtitle");
        subtitleDiv.scrollIntoView({ behavior: "smooth", block: "center" });

        subtitleBlocksContainer.appendChild(subtitleDiv);
    }
}


// Initialize or display popup container for subtitles
function createOrSetPopupContainer() {
    let popupContainer = document.getElementById("popup-subtitle-container");

    if (!popupContainer) {
        popupContainer = document.createElement("div");
        popupContainer.id = "popup-subtitle-container";
        popupContainer.className = "popup-container";

        // Style the popup container
        Object.assign(popupContainer.style, {
            position: "absolute",
            top: "50px",
            left: "50px",
            backgroundColor: "white",
            border: "1px solid #ccc",
            padding: "10px",
            boxShadow: "0 4px 8px rgba(0,0,0,0.2)",
            cursor: "move",
            overflowY: "auto",
            zIndex: "1000",
            maxWidth: "90vw",
            maxHeight: "90vh",
            width: "auto",
            height: "auto",
        });

        document.body.appendChild(popupContainer);
    }

    // Make popup draggable
    makePopupDraggable(popupContainer);

    // Double-click to hide popup
    popupContainer.addEventListener('dblclick', () => {
        popupContainer.style.display = 'none';
    });

    return popupContainer;
}

// Toggle elaboration mode and update popup display
document.addEventListener("DOMContentLoaded", () => {
    let isElaborationOn = false;

    document.getElementById("toggle-elaboration-button").addEventListener("click", () => {
        isElaborationOn = !isElaborationOn;
        const popupContainer = createOrSetPopupContainer();

        const elaborationImage = document.getElementById("toggle-elaboration-button").querySelector("img");
        elaborationImage.src = isElaborationOn ? IMAGES.elaborationOnIcon : IMAGES.elaborationOffIcon;
        elaborationImage.alt = isElaborationOn ? "Show Elaboration" : "Hide Elaboration";

        if (isElaborationOn) {
            const episodeSelect = document.getElementById('episode-select');
            const episodeNum = episodeSelect.value; // Get the selected episode number
            
            // Check if currentPlaybackStartIndex is defined
            const startIndex = typeof currentPlaybackStartIndex !== 'undefined'
                ? parseInt(currentPlaybackStartIndex, 10)
                : 0; // Set to 0 if undefined to fetch top 20

            const segmentCount = typeof currentPlaybackStartIndex !== 'undefined'
                ? parseInt(currentPlaybackSegmentCount, 10)
                : 20; // Fetch top 20 subtitles if start index is undefined

            if (!isNaN(startIndex) && !isNaN(segmentCount) && !isNaN(episodeNum)) {
                updatePopupWithAllSubtitles(episodeNum, startIndex, segmentCount);
                popupContainer.style.display = "block";
            } else {
                console.warn("Invalid startIndex, segmentCount, or episodeNum provided.");
            }
        } else {
            popupContainer.style.display = "none";
        }
    });
});


// Update and display subtitles in the popup container for a specific episode
function updatePopupWithAllSubtitles(episodeNum, startIndex, segmentCount) {
    const popupContainer = document.getElementById("popup-subtitle-container");
    if (!popupContainer) return;

    popupContainer.innerHTML = ''; // Clear existing subtitles

    const episodeKey = `Episode_${String(episodeNum).padStart(2, '0')}`;
    const episodeSubtitles = allEpisodesSubtitles[episodeKey];
    if (!episodeSubtitles) return;

    for (let i = startIndex - 1; i < startIndex + segmentCount - 1; i++) {
        if (i >= 0 && i < episodeSubtitles.korean.length) {
            const koreanSubtitle = episodeSubtitles.korean[i];
            const englishSubtitle = episodeSubtitles.english[i];
            
            const subtitleDiv = document.createElement("div");
            subtitleDiv.className = "subtitle-block";

            const indexBox = document.createElement("div");
            indexBox.className = "index-box";
            indexBox.textContent = `Ep ${episodeNum} - ${i + 1} | ${koreanSubtitle.timestamp}`;
            subtitleDiv.appendChild(indexBox);

            const koreanBox = document.createElement("div");
            koreanBox.className = "korean-box";
            koreanBox.textContent = koreanSubtitle.text;
            subtitleDiv.appendChild(koreanBox);

            if (mode === "Korean+English" && englishSubtitle) {
                const englishBox = document.createElement("div");
                englishBox.className = "english-box";
                englishBox.textContent = englishSubtitle.text;
                subtitleDiv.appendChild(englishBox);
            }

            popupContainer.appendChild(subtitleDiv);
        }
    }

    if (isElaborationOn) {
        popupContainer.style.display = 'block';
    }
}

// Make the popup draggable
function makePopupDraggable(element) {
    let offsetX = 0, offsetY = 0, startX = 0, startY = 0;

    element.onmousedown = function (e) {
        e.preventDefault();
        startX = e.clientX;
        startY = e.clientY;
        document.onmousemove = onMouseMove;
        document.onmouseup = stopDrag;
    };

    function onMouseMove(e) {
        e.preventDefault();
        offsetX = e.clientX - startX;
        offsetY = e.clientY - startY;
        startX = e.clientX;
        startY = e.clientY;
        element.style.top = (element.offsetTop + offsetY) + "px";
        element.style.left = (element.offsetLeft + offsetX) + "px";
    }

    function stopDrag() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// Initialize subtitles on page load
document.addEventListener("DOMContentLoaded", loadAllEpisodesSubtitles);


// Updated search functionality to allow wildcard (*) search
searchButton.addEventListener("click", () => {
    const searchTerm = searchInput.value.toLowerCase().trim();
    searchResultsContainer.innerHTML = '';

    // Check if search term is empty
    if (!searchTerm) {
        // Display the first 20 subtitles for the selected episode
        const episodeNum = parseInt(episodeSelect.value, 10);
        const episodeKey = `Episode_${String(episodeNum).padStart(2, '0')}`;
        const episodeSubtitles = allEpisodesSubtitles[episodeKey];

        if (episodeSubtitles) {
            searchResultsContainer.innerHTML = '';

            episodeSubtitles.korean.slice(0, 20).forEach((koreanSubtitle, index) => {
                const englishSubtitle = episodeSubtitles.english[index];
                const div = document.createElement("div");
                div.className = "search-result";

                div.innerHTML = `
                    <strong>Episode ${episodeNum} - ${koreanSubtitle.subtitleIndex}</strong>: 
                    <div>${koreanSubtitle.text}</div>
                    <div>${englishSubtitle ? englishSubtitle.text : ''}</div>
                `;
                div.dataset.index = koreanSubtitle.subtitleIndex;
                div.dataset.episode = episodeNum;

                // Event listener to play segments on click
                div.addEventListener("click", () => {
                    togglePopup();
                    const startIndex = koreanSubtitle.subtitleIndex;
                    let segmentCount = parseInt(segmentCountInput.value, 10);
                    if (isNaN(segmentCount) || segmentCount < 5) segmentCount = 5;

                    stopPlayback();
                    startIndexHighlighted = false;

                    playSegments(episodeNum, startIndex, segmentCount);
                    updateDisplayedSubtitles(startIndex, segmentCount, 0, startIndex, startIndexHighlighted);
                    updatePopupWithAllSubtitles(startIndex, segmentCount, 0, startIndex, startIndexHighlighted);
                });

                searchResultsContainer.appendChild(div);
            });

            togglePopup();
        } else {
            searchResultsContainer.innerHTML = '<div>No subtitles found for the selected episode.</div>';
        }
        return;
    }

    // Convert search term to regex pattern with * as wildcard
    const regexPattern = searchTerm.replace(/\*/g, '.*');
    const searchRegex = new RegExp(regexPattern, 'i');

    const searchResults = [];

    // Loop through all episodes and search subtitles
    Object.keys(allEpisodesSubtitles).forEach(episodeKey => {
        const episodeSubtitles = allEpisodesSubtitles[episodeKey];
        const episodeNumber = episodeKey.split('_')[1];

        const filteredSubtitles = episodeSubtitles.korean.map((koreanSubtitle, index) => {
            const englishSubtitle = episodeSubtitles.english[index];
            return {
                episode: episodeNumber,
                index: koreanSubtitle.subtitleIndex,
                koreanText: koreanSubtitle.text,
                englishText: englishSubtitle ? englishSubtitle.text : ""
            };
        }).filter(subtitle =>
            searchRegex.test(subtitle.koreanText) || searchRegex.test(subtitle.englishText)
        );

        searchResults.push(...filteredSubtitles);
    });

    // Display all matched results
    searchResults.forEach(subtitle => {
        const div = document.createElement("div");
        div.className = "search-result";

        div.innerHTML = `
            <strong>Episode ${subtitle.episode} - ${subtitle.index}</strong>: 
            <div>${subtitle.koreanText}</div>
            <div>${subtitle.englishText ? subtitle.englishText : ''}</div>
        `;
        div.dataset.index = subtitle.index;
        div.dataset.episode = subtitle.episode;

        // Event listener to play segments on click
        div.addEventListener("click", () => {
            togglePopup();
            const startIndex = subtitle.index;
            let segmentCount = parseInt(segmentCountInput.value, 10);
            if (isNaN(segmentCount) || segmentCount < 5) segmentCount = 5;

            const episodeNum = parseInt(subtitle.episode, 10);

            stopPlayback();
            startIndexHighlighted = false;

            playSegments(episodeNum, startIndex, segmentCount);
        });

        searchResultsContainer.appendChild(div);
    });

    // Display message if no results found
    if (!searchResults.length) {
        searchResultsContainer.innerHTML = '<div>No subtitles found.</div>';
    }
    togglePopup();
});

// Double-click to close popup
searchResultsContainer.addEventListener("dblclick", () => {
    searchResultsContainer.style.display = 'none';
});

// Toggle visibility of search popup
function togglePopup() {
    searchPopup.style.display = searchPopup.style.display === 'block' ? 'none' : 'block';
}

// Make the popup containers draggable
makePopupDraggable(popupContainer);
makePopupDraggable(searchResultsPopup);
