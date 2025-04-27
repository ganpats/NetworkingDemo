document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('date');
    const fetchImagesButton = document.getElementById('fetchImages');
    const imageGallery = document.getElementById('imageGallery');

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
        console.log(apiUrl);
        fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
        })
        .then(response => response.json())
        .then(data => {
            const imageUrls = data.map(e => e.HighResolution.replace('_mr.jpg', '.jpg'));
            displayImages(imageUrls);
        })
    }

    function displayImages(imageUrls) {
        imageGallery.innerHTML = '';
        imageUrls.forEach(imageUrl => {
            const img = document.createElement('img');
            img.src = imageUrl;
            img.alt = 'Image';
            img.addEventListener('click', () => openFullscreen(img.src));
            imageGallery.appendChild(img);
        });
    }

    // add next and previous buttons in fullscreen mode
    function openFullscreen(src) {
        const fullscreenDiv = document.createElement('div');
        fullscreenDiv.classList.add('fullscreen');
        
        const img = document.createElement('img');
        img.src = src;
        
        const closeBtn = document.createElement('span');
        closeBtn.classList.add('close');
        closeBtn.innerHTML = '&times;';
        closeBtn.addEventListener('click', () => {
            document.body.removeChild(fullscreenDiv);
        });

        const prevBtn = document.createElement('button');
        prevBtn.innerText = '<';
        prevBtn.addEventListener('click', () => {
            const currentImg = document.querySelector('.fullscreen img');
            const currentSrc = currentImg.src;
            const currentIndex = Array.from(imageGallery.children).findIndex(img => img.src === currentSrc);
            if (currentIndex > 0) {
                const prevImg = imageGallery.children[currentIndex - 1].src;
                currentImg.src = prevImg;
            }
        });
        
        const nextBtn = document.createElement('button');
        nextBtn.innerText = '>';
        nextBtn.addEventListener('click', () => {
            const currentImg = document.querySelector('.fullscreen img');
            const currentSrc = currentImg.src;
            const currentIndex = Array.from(imageGallery.children).findIndex(img => img.src === currentSrc);
            if (currentIndex < imageGallery.children.length - 1) {
                const nextImg = imageGallery.children[currentIndex + 1].src;
                currentImg.src = nextImg;
            }
        });

        fullscreenDiv.appendChild(prevBtn);
        fullscreenDiv.appendChild(img);
        fullscreenDiv.appendChild(nextBtn);

        fullscreenDiv.appendChild(closeBtn);
        
        
        document.body.appendChild(fullscreenDiv);
    }
});