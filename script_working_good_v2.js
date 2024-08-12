document.addEventListener('DOMContentLoaded', () => {
    const debug_print = true; // Set this to false to disable debug prints

    const log = (message) => {
        if (debug_print) {
            console.log(message);
        }
    };

    const audio = document.getElementById('audioPlayer');
    const transcriptDiv = document.getElementById('transcript');
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');
    const sideMenu = document.getElementById('sideMenu');
    const toggleMenuButton = document.getElementById('toggleMenuButton');
    const fontSizeButton = document.getElementById('fontSizeButton');
    const uvodniTekst = document.getElementById('uvodniTekst');

    const audioBasePath = 'MP.mp3/';
    const transcriptFileName = 'consolidated_transcript_0.json';

    let audioSegments = [];
    let transcriptData = {};
    let currentSegmentIndex = -1;
    let currentTranscriptData = [];
    let baseFileNames = [];
    let currentBaseFileIndex = -1;
    let segmentStartTime = 0;

    let isFontLarge = false;

    function loadTranscript() {
        fetch(transcriptFileName)
            .then(response => response.json())
            .then(data => {
                transcriptData = data;
                baseFileNames = Object.keys(transcriptData);
                populateSideMenu();
                showHome(); // Set initial state
            })
            .catch(error => log('Error loading transcript:', error));
    }

    function populateSideMenu() {
        log('Populating side menu...');
        sideMenu.innerHTML = ''; // Clear existing menu content
        const ul = document.createElement('ul');

        // Add "HOME" button
        const homeLi = document.createElement('li');
        const homeA = document.createElement('a');
        homeA.href = '#';
        homeA.textContent = 'HOME';
        homeA.classList.add('menu-item', 'home-item'); // Add home-item class for home button
        homeA.dataset.index = -1; // Set data-index to -1 for HOME
        homeA.addEventListener('click', (e) => {
            e.preventDefault();
            log('Clicked HOME');
            showHome();
        });
        homeLi.appendChild(homeA);
        ul.appendChild(homeLi);

        // Add chapters
        baseFileNames.forEach((fileName, index) => {
            log(`Adding chapter ${index} - ${fileName}`);
            const li = document.createElement('li');
            const chapterLabel = getLabelForBaseFile(fileName);
            const a = document.createElement('a');
            a.href = '#';
            a.textContent = chapterLabel;
            a.classList.add('menu-item'); // Add a class for consistent styling
            a.dataset.index = index; // Store index for easy access
            a.addEventListener('click', (e) => {
                e.preventDefault();
                log(`Clicked chapter index: ${index}`);
                loadChapter(index);
            });
            li.appendChild(a);
            ul.appendChild(li);
        });
        sideMenu.appendChild(ul);
    }

    function showHome() {
        uvodniTekst.style.display = 'block'; // Show the home page text
        transcriptDiv.innerHTML = ''; // Clear transcript
        audio.pause(); // Pause audio if playing

        // Highlight HOME item in side menu and remove highlight from chapters
        document.querySelectorAll('.side-menu .menu-item').forEach(item => {
            item.classList.remove('active');
        });
        const homeItem = document.querySelector('.side-menu .home-item');
        if (homeItem) {
            homeItem.classList.add('active');
        }

        currentBaseFileIndex = -1; // Set to home
        updateButtons(); // Update buttons based on the home state
    }

    function loadChapter(index) {
        log(`Loading chapter with index: ${index}`);

        // Clear previous active class from all menu items
        document.querySelectorAll('.side-menu .menu-item').forEach(item => {
            item.classList.remove('active');
        });

        // Add active class to the current chapter link
        const chapterLinks = document.querySelectorAll('.side-menu .menu-item');
        const targetIndex = index + 1; // +1 to account for the "HOME" link
        if (targetIndex >= 0 && targetIndex < chapterLinks.length) {
            log(`Adding active class to: ${chapterLinks[targetIndex].textContent}`);
            chapterLinks[targetIndex].classList.add('active');
        } else {
            log('Index out of range:', targetIndex);
        }

        uvodniTekst.style.display = 'none'; // Hide the home page text
        currentBaseFileIndex = index;
        audioSegments = Object.keys(transcriptData[baseFileNames[currentBaseFileIndex]]).sort();
        currentSegmentIndex = 0;
        loadAndPlaySegment();

        updateSideMenuHighlight(); // Ensure side menu is updated
        updateButtons(); // Update button states
    }

    function loadAndPlaySegment() {
        if (currentSegmentIndex < audioSegments.length) {
            const segmentFileName = `${audioBasePath}${audioSegments[currentSegmentIndex]}`;
            audio.src = segmentFileName;
            audio.play().catch(error => log('Error playing audio:', error));

            const segmentData = transcriptData[baseFileNames[currentBaseFileIndex]][audioSegments[currentSegmentIndex]];
            if (segmentData) {
                currentTranscriptData = segmentData.words;
                segmentStartTime = segmentData.start;
                buildTranscript();
            }
            updateButtons(); // Update button states when a new segment is loaded
        }
    }

    function buildTranscript() {
        transcriptDiv.innerHTML = '';

        const baseFileName = baseFileNames[currentBaseFileIndex];
        const labelDiv = document.createElement('div');
        labelDiv.classList.add('chapter-label');
        labelDiv.textContent = getLabelForBaseFile(baseFileName);
        transcriptDiv.appendChild(labelDiv);
        transcriptDiv.appendChild(document.createElement('br'));

        const sortedWords = currentTranscriptData.slice().sort((a, b) => a.start - b.start);

        let lastSpeaker = '';
        let textDiv = null;

        sortedWords.forEach(word => {
            const speaker = word.speaker || 'Unknown Speaker';

            if (speaker !== lastSpeaker) {
                if (lastSpeaker !== '') {
                    transcriptDiv.appendChild(document.createElement('br'));
                }
                const speakerDiv = document.createElement('div');
                speakerDiv.classList.add('speaker');
                speakerDiv.textContent = `   ${speaker}`;
                transcriptDiv.appendChild(speakerDiv);
                lastSpeaker = speaker;

                textDiv = document.createElement('div');
                transcriptDiv.appendChild(textDiv);
            }

            const wordSpan = document.createElement('span');
            wordSpan.classList.add('word');
            wordSpan.dataset.start = (word.start - segmentStartTime).toFixed(2);
            wordSpan.dataset.end = (word.end - segmentStartTime).toFixed(2);
            wordSpan.textContent = word.word + ' ';
            textDiv.appendChild(wordSpan);
        });
    }

    function getLabelForBaseFile(baseFileName) {
        const match = baseFileName.match(/^MP_(\d{2})$/);
        if (match) {
            const index = parseInt(match[1], 10);
            if (index === 0) {
                return 'Predgovor';
            } else if (index >= 1 && index <= 30) {
                return `Poglavlje ${index}`;
            }
        }
        return 'Unknown';
    }

    function highlightCurrentWord(currentTime) {
        const words = transcriptDiv.querySelectorAll('.word');
        words.forEach(word => {
            const start = parseFloat(word.dataset.start);
            const end = parseFloat(word.dataset.end);

            if (currentTime >= start && currentTime <= end) {
                word.classList.add('highlight');
            } else {
                word.classList.remove('highlight');
            }
        });
    }

    function updateSideMenuHighlight() {
        log('Updating side menu highlight...');
        log('currentBaseFileIndex:', currentBaseFileIndex);

        // Remove the active class from all menu items
        document.querySelectorAll('.side-menu .menu-item').forEach((item) => {
            log('Removing active from:', item.textContent);
            item.classList.remove('active');
        });

        // Highlight the correct menu item based on the currentBaseFileIndex
        const menuItems = document.querySelectorAll('.side-menu .menu-item');
        if (currentBaseFileIndex === -1) {
            // Handle HOME item
            const homeItem = document.querySelector('.side-menu .home-item');
            if (homeItem) {
                log('Adding active to HOME');
                homeItem.classList.add('active');
            }
        } else if (currentBaseFileIndex >= 0 && currentBaseFileIndex < baseFileNames.length) {
            // Handle chapter items
            const targetIndex = currentBaseFileIndex + 1; // +1 to account for HOME item
            if (targetIndex >= 0 && targetIndex < menuItems.length) {
                log('Adding active to:', menuItems[targetIndex].textContent);
                menuItems[targetIndex].classList.add('active');
            } else {
                log('Index out of range for highlighting:', targetIndex);
            }
        }
    }

    function updateButtons() {
        const isHome = currentBaseFileIndex === -1;
        prevButton.disabled = isHome || (currentBaseFileIndex === 0 && currentSegmentIndex === 0);
        nextButton.disabled = (currentBaseFileIndex === baseFileNames.length - 1 && currentSegmentIndex === audioSegments.length - 1);
    }
    

    // Event listener for the "Previous" button
prevButton.addEventListener('click', () => {
    if (currentBaseFileIndex === -1) {
        // HOME state: prevButton should be disabled
        // No action needed as prevButton is already disabled on HOME
    } else if (currentSegmentIndex === 0 && currentBaseFileIndex === 0) {
        // At the start of the first chapter (index 0): Go to HOME
        showHome();
    } else if (currentSegmentIndex > 0) {
        // In the middle of a chapter: Go to the previous segment
        currentSegmentIndex--;
        loadAndPlaySegment();
    } else if (currentBaseFileIndex > 0) {
        // At the start of a chapter (but not the first chapter): Go to the last segment of the previous chapter
        currentBaseFileIndex--;
        audioSegments = Object.keys(transcriptData[baseFileNames[currentBaseFileIndex]]).sort();
        currentSegmentIndex = audioSegments.length - 1;
        loadAndPlaySegment();
    }
    updateSideMenuHighlight();
    updateButtons(); // Ensure button states are updated
});

// Event listener for the "Next" button
nextButton.addEventListener('click', () => {
    if (currentBaseFileIndex === -1) {
        // HOME state: Go to the first chapter
        loadChapter(0);
    } else if (currentSegmentIndex < audioSegments.length - 1) {
        // In the middle of a chapter: Go to the next segment
        currentSegmentIndex++;
        loadAndPlaySegment();
    } else if (currentBaseFileIndex < baseFileNames.length - 1) {
        // At the end of a chapter: Go to the first segment of the next chapter
        currentBaseFileIndex++;
        audioSegments = Object.keys(transcriptData[baseFileNames[currentBaseFileIndex]]).sort();
        currentSegmentIndex = 0;
        loadAndPlaySegment();
    }
    updateSideMenuHighlight();
    updateButtons(); // Ensure button states are updated
});


    audio.addEventListener('timeupdate', () => {
        highlightCurrentWord(audio.currentTime - segmentStartTime);
        updateSideMenuHighlight(); // Update side menu highlight during audio playback
    });

    audio.addEventListener('ended', () => {
        if (currentSegmentIndex < audioSegments.length - 1) {
            currentSegmentIndex++;
            loadAndPlaySegment();
        } else if (currentBaseFileIndex < baseFileNames.length - 1) {
            currentBaseFileIndex++;
            currentSegmentIndex = 0;
            loadChapter(currentBaseFileIndex); // Load new chapter
        } else {
            showHome(); // Go back to HOME if all chapters are finished
        }
        updateSideMenuHighlight();
    });

    // Toggle side menu visibility
    toggleMenuButton.addEventListener('click', () => {
        sideMenu.classList.toggle('hidden');

        // Add or remove class based on the visibility of the side menu
        if (sideMenu.classList.contains('hidden')) {
            document.body.classList.remove('menu-visible');
            document.body.classList.add('menu-hidden');
        } else {
            document.body.classList.remove('menu-hidden');
            document.body.classList.add('menu-visible');
        }
    });

    // Toggle font size
    fontSizeButton.addEventListener('click', () => {
        isFontLarge = !isFontLarge;
        if (isFontLarge) {
            transcriptDiv.classList.remove('font-small');
            transcriptDiv.classList.add('font-large');
            fontSizeButton.textContent = 'Manji Tekst'; // Update button text
        } else {
            transcriptDiv.classList.remove('font-large');
            transcriptDiv.classList.add('font-small');
            fontSizeButton.textContent = 'Veći Tekst'; // Update button text
        }
    });

    loadTranscript();
});
