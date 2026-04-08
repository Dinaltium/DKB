const fs = require('fs');
fetch('https://boldkit.dev/r/dropdown-menu.json')
  .then(res => res.json())
  .then(data => {
    fs.writeFileSync('src/components/ui/dropdown-menu.tsx', data.files[0].content);
    console.log('Success');
  });
