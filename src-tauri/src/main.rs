// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use lazy_static::lazy_static;
use rand::Rng;
use serde::{Deserialize, Serialize};
use std::{
    io::{Read, Write},
    sync::{Arc, Mutex},
};

// 文件夹位置的变量
lazy_static! {
    static ref DIRECTORY: Arc<Mutex<String>> = Arc::new(Mutex::new(String::new()));
}

/**
 * wallhaven 参数
 */
#[derive(Deserialize, Serialize)]
#[allow(non_snake_case)]
struct WallhavenParams {
    sorting: String,
    order: String,
    seed: i32,
    page: i32,
    categories: String,
    purity: i32,
    atleast: String,
    ratios: String,
    topRange: String,
    apikey: String,
}

/**
 * 获取壁纸数据
 */
fn get_wallpaper_data(atleast: String, apikey: String) -> Result<String, String> {
    let q = WallhavenParams {
        sorting: "toplist".to_string(),
        order: "desc".to_string(),
        seed: 1,
        page: 1,
        categories: "111".to_string(),
        purity: 100,
        topRange: "3d".to_owned(),
        atleast,
        ratios: "16x9".to_string(),
        apikey,
    };

    let url = "https://wallhaven.cc/api/v1/search?".to_owned()
        + serde_qs::to_string(&q).unwrap().as_str();
    println!("url: {}", url);
    let resp = reqwest::blocking::get(url).unwrap();
    let body = resp.text().unwrap();
    Ok(body)
}

/**
 * 返回前端的图片数据格式
 */
#[derive(Deserialize, Serialize, Debug, Clone)]
struct ImageData {
    /**
     * 路径
     */
    path: String,
    /**
     * 缩略图
     */
    thumb: String,
}

/**
 * 将原始数据转换为图片列表
 */
fn convert_to_image_list(data: String) -> Vec<ImageData> {
    let json: serde_json::Value = serde_json::from_str(&data).unwrap();
    let mut image_list: Vec<ImageData> = Vec::new();
    for item in json["data"].as_array().unwrap() {
        let image_url = item["path"].as_str().unwrap();
        let thumb_url = item["thumbs"]["large"].as_str().unwrap();
        image_list.push(ImageData {
            path: image_url.to_owned(),
            thumb: thumb_url.to_owned(),
        });
    }
    image_list
}

/**
 * 获取随机 5 张不重复的壁纸
 */
fn get_random_images(image_list: Vec<ImageData>) -> Vec<ImageData> {
    let mut rng = rand::thread_rng();
    let mut random_images: Vec<ImageData> = Vec::new();
    println!("image_list: {:?}", image_list);
    for _ in 0..5 {
        let random_index = rng.gen_range(0..image_list.len());
        let random_image = image_list[random_index].clone();
        random_images.push(random_image);
    }
    println!("random_images: {:?}", random_images);
    random_images
}

/**
 * 返回数据到前端
 * Learn more about Tauri commands at https://tauri.app/v1/guides/features/command
 */
#[tauri::command]
fn get_data(atleast: String, apikey: String) -> Vec<ImageData> {
    let data = get_wallpaper_data(atleast, apikey).unwrap();
    let image_list = convert_to_image_list(data);
    get_random_images(image_list)
}

/**
 * 从文件夹中获取数据
 */

/**
 * 获取图片 URL 为入参，并设置为 windows 的壁纸
 */
#[tauri::command]
fn load_and_set_wallpaper(image_url: String) -> bool {
    let filename = download_image(image_url);
    set_wallpaper(filename)
}

/**
 * 仅下载图片到文件夹
 */
#[tauri::command]
fn download_image(image_url: String) -> String {
    println!("url: {}", image_url);
    let resp = reqwest::blocking::get(image_url.clone()).unwrap();
    let body = resp.bytes().unwrap();

    // 在 DIRECTORY 目录下保存图片
    let dir = DIRECTORY.lock().unwrap();
    // 使用 image_url 最后一段作为文件名
    println!("dir: {}", *dir);
    let image_name = image_url.split("/").last().unwrap();
    let filename = format!("{}/{}", *dir, image_name);
    let filename_clone = filename.clone(); // Clone the filename
    println!("filename: {}", filename_clone);
    let mut file = std::fs::File::create(filename_clone).unwrap();
    std::io::copy(&mut body.as_ref(), &mut file).unwrap();

    filename
}

/**
 * 设置为壁纸
 */
#[tauri::command]
fn set_wallpaper(file_path: String) -> bool {
    let path = std::path::Path::new(&file_path);
    let result = wallpaper::set_from_path(path.to_str().unwrap());

    match result {
        Ok(_) => {
            println!("set wallpaper success");
            true
        }
        Err(_) => {
            println!("set wallpaper failed");
            false
        }
    }
}

/**
 * 接收前端传递的文件夹位置，作为壁纸存储位置
 */
#[tauri::command]
fn set_directory(directory: String) {
    let mut dir = DIRECTORY.lock().unwrap();
    *dir = directory;

    // 位置存储到本地缓存
    let mut file = match std::fs::File::create("directory.txt") {
        Ok(file) => file,
        Err(_) => panic!("create file failed"),
    };

    match file.write_all(dir.as_bytes()) {
        Ok(_) => println!("write file success"),
        Err(_) => println!("write file failed"),
    }
}

/**
 * 获取文件夹位置
 */
#[tauri::command]
fn get_directory() -> String {
    let mut file = match std::fs::File::open("directory.txt") {
        Ok(file) => file,
        Err(_) => panic!("open file failed"),
    };

    let mut dir = String::new();
    match file.read_to_string(&mut dir) {
        Ok(_) => println!("read file success"),
        Err(_) => println!("read file failed"),
    }

    // 放到全局变量中
    let mut dir_global = DIRECTORY.lock().unwrap();
    *dir_global = dir.clone();

    dir
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_data,
            download_image,
            load_and_set_wallpaper,
            set_wallpaper,
            set_directory,
            get_directory
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
