import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { dialog } from '@tauri-apps/api';
import './App.css';

function App() {
  const [imgs, setImgs] = useState<string[]>();
  const [directory, setDirectory] = useState<string>('');

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

  // 选择文件夹并将文件夹路径传给rust
  const selectDirectory = async () => {
    const path = await dialog.open({
      directory: true,
    });
    if (path) {
      let directory;
      if (Array.isArray(path)) {
        directory = path[0];
      } else {
        directory = path;
      }
      setDirectory(directory);
      invoke('set_directory', { directory: path });
    }
  };

  return (
    <div className="container">
      <h1>Wallpaper Gallery</h1>
      <div>
        {/* 选择文件夹 */}
        <button onClick={selectDirectory}>选择文件夹</button>
        <p>当前选择的文件夹：{directory}</p>
      </div>
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
