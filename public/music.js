document.addEventListener('DOMContentLoaded', () => {
    const musicFiles = [];
    let currentTrackIndex = 0;
    const audioElement = new Audio();

    // Function to shuffle an array
    const shuffleArray = (array) => {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    };
    // Set the audio volume to 40%
    audioElement.volume = 0.4;
    // Fetch the list of music files from the server
    fetch('/music')
        .then(response => response.json())
        .then(files => {
            musicFiles.push(...files.map(file => `./music/${file}`));
            shuffleArray(musicFiles);
            audioElement.src = musicFiles[currentTrackIndex];
            audioElement.play().catch(error => {
                console.error('Error playing audio:', error);
            });
        })
        .catch(error => {
            console.error('Error fetching music files:', error);
        });

    // Function to play the next track
    const playNextTrack = () => {
        currentTrackIndex = (currentTrackIndex + 1) % musicFiles.length;
        audioElement.src = musicFiles[currentTrackIndex];
        audioElement.play().catch(error => {
            console.error('Error playing audio:', error);
        });
    };

    // Event listener for when the current track ends
    audioElement.addEventListener('ended', playNextTrack);

    // Error event listener
    audioElement.addEventListener('error', (e) => {
        console.error('Error loading audio:', e);
    });

    // Log the supported audio formats
    // console.log('Supported audio formats:');
    // console.log('MP3:', audioElement.canPlayType('audio/mpeg'));
    // console.log('M4A:', audioElement.canPlayType('audio/mp4'));
    // console.log('OGG:', audioElement.canPlayType('audio/ogg'));
});