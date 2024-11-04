document.addEventListener("DOMContentLoaded", () => {
    const photoContainer = document.getElementById("photo-container");
  
    function loadImages() {
      fetch("/api/images")
        .then((response) => response.json())
        .then((images) => {
          photoContainer.innerHTML = "";
          images.forEach((src) => {
            const img = document.createElement("img");
            img.src = src;
            img.alt = "Image Frame";
            img.classList.add("photo");
            img.addEventListener("click", () => handleSelectedPhoto(img));
            photoContainer.appendChild(img);
          });
        })
        .catch((error) => console.error("Error loading images:", error));
    }
  
    function handleSelectedPhoto(photo) {
      // Redirect to edit page with selected photo
      window.location.href = `page2.html?src=${encodeURIComponent(photo.src)}`;
    }
  
    // Load images when page loads
    loadImages();
  });
  