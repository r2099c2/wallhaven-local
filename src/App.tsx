import { useEffect, useState } from 'react';
import { convertFileSrc, invoke } from '@tauri-apps/api/tauri';
import { dialog } from '@tauri-apps/api';
import { message, Button } from 'antd';
import './App.css';
import { BaseDirectory, readDir } from '@tauri-apps/api/fs';

function App() {
  const [imgs, setImgs] = useState<string[]>();
  const [localImgs, setLocalImgs] = useState<string[]>();
  const [directory, setDirectory] = useState<string>('');

  const fetchData = async () => {
    const res = await invoke<Array<string>>('get_data');
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
        // 从文件夹中遍历图片文件
        loadCurrentImages(res);
      }
    });
  }, []);

  // 从文件夹中遍历图片文件
  const loadCurrentImages = async (directory: string) => {
    if (!directory) {
      return;
    }

    readDir('wallpaper', { dir: BaseDirectory.Picture }).then((res) => {
      const imgs = res
        .filter(
          (item) => item.name?.endsWith('.jpg') || item.name?.endsWith('.png')
        )
        .map((item) => convertFileSrc(item.path));
      console.log(imgs);
      setLocalImgs(imgs);
    });
  };

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
        {localImgs?.map((img, i) => (
          <img src={img} alt="img" className="item" key={i} />
        ))}
      </div>
      <div className="row">
        {imgs?.map((img, i) => (
          <div key={i} className="cell" onClick={() => setBgImg(img)}>
            <img src={img} alt="img" className="item" />
          </div>
        ))}
      </div>

      <Button onClick={fetchData}>获取数据</Button>
    </div>
  );
}

export default App;
