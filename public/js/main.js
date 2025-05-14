document.addEventListener('DOMContentLoaded', function() {
  // Add any client-side interactivity here
  console.log('Adult Doodle Comics loaded');
  
  // Example: Add doodle effect to buttons on hover
  const buttons = document.querySelectorAll('.doodle-button');
  buttons.forEach(button => {
    button.addEventListener('mouseenter', function() {
      this.style.transform = 'rotate(2deg)';
    });
    
    button.addEventListener('mouseleave', function() {
      this.style.transform = '';
    });
  });
});

document.getElementById('comic-search').addEventListener('input', function() {
  const searchTerm = this.value.toLowerCase();
  document.querySelectorAll('.comic-card').forEach(card => {
    const title = card.querySelector('h3').textContent.toLowerCase();
    card.style.display = title.includes(searchTerm) ? 'block' : 'none';
  });
});