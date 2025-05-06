document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('date');
    const fetchImagesButton = document.getElementById('fetchImages');
    let currentImgIndex = 0;
    let imageUrls = [];
    let hdUrls = [];

    // set  today as default date
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0'); // January is 0!
    const yyyy = today.getFullYear();
    const formattedDate = `${yyyy}-${mm}-${dd}`;
    dateInput.value = formattedDate;
    dateInput.setAttribute('max', formattedDate); // set max date to today
    
    fetchImagesButton.addEventListener('click', () => {
        const selectedDate = dateInput.value;
        if (!selectedDate) {
            alert('Please select a date.');
            return;
        }
        fetchImages(selectedDate);
    });

    function fetchImages(date) {
        const editionId = '52'; // udaipur city
        // const editionId = '53'; // udaipur Jila
        // get date in dd/MM/yyyy format
        const dateParts = date.split('-');
        const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`; // Format date to DD/MM/YYYY
        const apiUrl = `https://epaper.patrika.com/Home/GetAllpages?editionid=${editionId}&editiondate=${formattedDate}`;
        fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
        })
        .then(response => response.json())
        .then(data => {
            imageUrls = data.map(e => e.HighResolution);
            hdUrls = data.map(e => e.HighResolution.replace('_mr.jpg', '.jpg'));
            displayImages();
            preloadImages(imageUrls)
            .then(() => {
                console.log('All normal images loaded. Now loading HD images...');
                return preloadImages(hdUrls); // Preload HD images after normal images
            })
            .then(() => {
                console.log('All HD images loaded.');
            })
            .catch(error => {
                console.error(error); // Handle any errors that occurred during loading
            });
        })
    }

    // Function to preload images and return a Promise
    function preloadImages(urls) {
        const promises = urls.map(url => {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.src = url;
                img.onload = () => resolve(url); // Resolve the promise when the image loads
                img.onerror = () => reject(new Error(`Failed to load image: ${url}`)); // Reject if there's an error
            });
        });
        return Promise.all(promises); // Return a promise that resolves when all images are loaded
    }

    function displayImages() {
        currentImgIndex = 0;
        openFullscreen(imageUrls[currentImgIndex]);
    }

    function openFullscreen(src) {
        currentImgIndex = imageUrls.indexOf(src);
    
        const fullscreenDiv = document.createElement('div');
        fullscreenDiv.classList.add('fullscreen');
    
        const img = document.createElement('img');
        img.src = ''; // start blank until loaded
    
        const loader = document.createElement('div');
        loader.classList.add('loader');
        loader.innerText = 'Loading...'; // replace with a spinner if needed
    
        const closeBtn = document.createElement('span');
        closeBtn.classList.add('close');
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(fullscreenDiv);
        });
    
        const indexIndicator = document.createElement('div');
        indexIndicator.classList.add('index-indicator');
        indexIndicator.innerText = `${currentImgIndex + 1} / ${imageUrls.length}`;
    
        const prevBtn = document.createElement('button');
        prevBtn.classList.add('prev');
        prevBtn.innerText = '<';
        prevBtn.addEventListener('click', () => {
            if (currentImgIndex > 0) {
                currentImgIndex--;
                img.src = hdUrls[currentImgIndex];
                indexIndicator.innerText = `${currentImgIndex + 1} / ${imageUrls.length}`;
            }
        });
    
        const nextBtn = document.createElement('button');
        nextBtn.classList.add('next');
        nextBtn.innerText = '>';
        nextBtn.addEventListener('click', () => {
            if (currentImgIndex < imageUrls.length - 1) {
                currentImgIndex++;
                updateImage();
            }
        });
    
        function updateImage() {
            loader.style.display = 'block';
            img.src = imageUrls[currentImgIndex];;
            const hdSrc = hdUrls[currentImgIndex];
            const hdImg = new Image();
            hdImg.onload = () => {
                img.src = hdSrc;
                loader.style.display = 'none';
            };
            hdImg.src = hdSrc;
            indexIndicator.innerText = `${currentImgIndex + 1} / ${imageUrls.length}`;
        }
    
        fullscreenDiv.appendChild(prevBtn);
        fullscreenDiv.appendChild(img);
        fullscreenDiv.appendChild(loader);
        fullscreenDiv.appendChild(nextBtn);
        fullscreenDiv.appendChild(indexIndicator);
        fullscreenDiv.appendChild(closeBtn);
        document.body.appendChild(fullscreenDiv);
    
        updateImage(); // Load the initial image with loader
    }
});