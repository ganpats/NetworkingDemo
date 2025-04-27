document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('date');
    const fetchImagesButton = document.getElementById('fetchImages');
    let currentImgIndex = 0;
    let imageUrls = [];

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
            imageUrls = data.map(e => e.HighResolution.replace('_mr.jpg', '.jpg'));
            displayImages();
        })
    }

    function displayImages() {
        currentImgIndex = 0;
        openFullscreen(imageUrls[currentImgIndex]);
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
        prevBtn.classList.add('next');
        prevBtn.innerText = '<';
        prevBtn.addEventListener('click', () => {
            const currentImg = document.querySelector('.fullscreen img');
            if (currentImgIndex > 0) {
                currentImgIndex--;
                const prevImg = imageUrls[currentImgIndex];
                currentImg.src = prevImg;
            }
        });
        
        const nextBtn = document.createElement('button');
        nextBtn.classList.add('next');
        nextBtn.innerText = '>';
        nextBtn.addEventListener('click', () => {
            const currentImg = document.querySelector('.fullscreen img');
            if (currentImgIndex < imageUrls.length - 1) {
                currentImgIndex++;
                const nextImg = imageUrls[currentImgIndex];
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