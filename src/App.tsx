import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import './App.css';

function App() {
  const [imgs, setImgs] = useState<string[]>();

  const fetchData = async () => {
    const res = await invoke<Array<string>>('get_data');
    console.log(res);
    setImgs(res);
  };

  const setBgImg = (imageUrl: string) => {
    invoke('set_wallpaper', { imageUrl });
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="container">
      <div className="row">
        {imgs?.map((img, i) => (
          <div key={i} className="cell" onClick={() => setBgImg(img)}>
            <img src={img} alt="" className="item" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
