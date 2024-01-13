import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { dialog } from '@tauri-apps/api';
import { message } from 'antd';
import './App.css';

function App() {
  const [imgs, setImgs] = useState<string[]>();
  const [directory, setDirectory] = useState<string>('');

  const fetchData = async () => {
    const res = await invoke<Array<string>>('get_data');
    console.log(res);
    setImgs(res);
  };

  const setBgImg = async (imageUrl: string) => {
    message.loading('设置中...', 10);
    await invoke('set_wallpaper', { imageUrl });
    message.destroy();
    message.info('设置成功');
  };

  useEffect(() => {
    // 从本地获取缓存的文件夹路径
    invoke<string>('get_directory').then((res) => {
      if (res) {
        setDirectory(res);
      }
    });
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
      // 将文件地址存储到本地文件
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
            <img src={img} alt="img" className="item" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
