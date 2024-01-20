import { useEffect, useState } from 'react';
import { convertFileSrc, invoke } from '@tauri-apps/api/tauri';
import { dialog } from '@tauri-apps/api';
import { message, Button, Select, Input, Tabs } from 'antd';
import type { TabsProps } from 'antd';
import cx from 'classnames';
import s from './App.module.css';
import { readDir } from '@tauri-apps/api/fs';

interface ImageData {
  path: string;
  thumb: string;
}

function App() {
  const [imgs, setImgs] = useState<ImageData[]>();
  const [localImgs, setLocalImgs] = useState<string[]>();
  const [directory, setDirectory] = useState<string>('');
  const [selectedImg, setSelectedImg] = useState<string>('');
  const [atleast, setAtleast] = useState<String>('1920x1080');
  const [apiKey, setApiKey] = useState<String>('');
  const [netLen, setNetLen] = useState<number>(5);

  const fetchData = async () => {
    const res = await invoke<Array<ImageData>>('get_data', {
      atleast,
      apikey: apiKey,
      len: netLen,
    });
    setImgs(res);
  };

  const setBgImg = async (filePath: string) => {
    message.loading('设置中...', 10);
    const res = await invoke('set_wallpaper', { filePath });
    message.destroy();
    if (res) {
      message.info('设置成功');
    } else {
      message.error('设置失败');
    }
  };

  const loadAndSetWallpaper = async (imageUrl: string) => {
    message.loading('设置中...', 0);
    const res = await invoke('load_and_set_wallpaper', { imageUrl });
    message.destroy();
    if (res) {
      message.info('设置成功');
    } else {
      message.error('设置失败');
    }
  };

  /**
   * 下载图片到文件夹
   */
  const downloadImage = async (imageUrl: string) => {
    message.loading('下载中...', 0);
    const res = await invoke('download_image', { imageUrl });
    message.destroy();
    if (res) {
      message.info('下载成功');
      // 刷新文件夹
      loadCurrentImages();
    } else {
      message.error('下载失败');
    }
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
  const loadCurrentImages = async (directoryParam: string = directory) => {
    if (!directoryParam) {
      return;
    }

    readDir(directoryParam).then((res) => {
      const imgs = res
        .filter(
          (item) => item.name?.endsWith('.jpg') || item.name?.endsWith('.png')
        )
        .map((item) => convertFileSrc(item.path));
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

  const onResolutionChange = (value: string) => {
    setAtleast(value);
  };

  const LocalImageTab = (
    <>
      <h2>本地文件：</h2>
      <div className={s.localRow}>
        {localImgs?.map((img, i) => (
          <img
            src={img}
            alt="localImg"
            className={s.localImg}
            key={i}
            onClick={() => setBgImg(img)}
          />
        ))}
      </div>
    </>
  );

  const NetImageTab = (
    <>
      <h2>网络图片（点击下载并设置）：</h2>
      <div className={s.selectorWrapper}>
        <Select
          defaultValue="1920x1080"
          style={{ width: 120 }}
          onChange={onResolutionChange}
          options={[
            { value: '1920x1080', label: '1920x1080' },
            { value: '3440x1440', label: '3440x1440' },
          ]}
        />
        <Input
          placeholder="api key"
          onChange={(e) => setApiKey(e.currentTarget.value)}
        />
        <Input
          placeholder="图片数量"
          type="number"
          onChange={(e) => setNetLen(Number(e.currentTarget.value))}
        />
      </div>
      <Button
        type="primary"
        size="large"
        className={s.downloadBtn}
        onClick={fetchData}
      >
        下载新的照片
      </Button>
      <div className={s.netRow}>
        {imgs?.map((img, i) => (
          <div
            className={cx(s.netCell, {
              [s.selected]: selectedImg === img.path,
            })}
            onClick={() => setSelectedImg(img.path)}
          >
            <img src={img.thumb} alt="img" key={i} className={s.netImg} />
            {selectedImg === img.path && (
              <div className={s.actions}>
                <Button onClick={() => loadAndSetWallpaper(img.path)}>
                  下载并设置
                </Button>
                <Button type="primary" onClick={() => downloadImage(img.path)}>
                  仅下载
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );

  const tabItems: TabsProps['items'] = [
    {
      key: 'local',
      label: '本地图片',
      children: LocalImageTab,
    },
    {
      key: 'net',
      label: '网络加载图片',
      children: NetImageTab,
    },
  ];

  return (
    <div className={s.container}>
      <h1>Wallpaper Gallery</h1>
      <div className={s.chooseBtnWrapper}>
        {/* 选择文件夹 */}
        <Button onClick={selectDirectory}>选择文件夹</Button>
        <p>当前选择的文件夹：{directory}</p>
      </div>
      <Tabs defaultActiveKey="local" items={tabItems} />
    </div>
  );
}

export default App;
