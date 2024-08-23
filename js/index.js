const baseUrl = "https://www.hhlqilongzhu.cn/api/dg_kugouSQ.php";

// 网络请求模块
const fetchJson = async (url) => {
  const response = await fetch(url);
  if (!response.ok) throw new Error("网络响应不正常");
  return response.json();
};

// Audio 控制模块
const audioController = (() => {
  let currentUrl = ""; // 记录当前播放的音乐URL
  let currentPlayingIcon = null; // 记录当前播放的图标

  const audio = document.querySelector("audio");

  // 加载并播放音乐
  const loadMusic = async (url) => {
    try {
      const data = await fetchJson(url);
      if (!data.music_url) {
        throw new Error("音乐 URL 不存在");
      }
      audio.src = data.music_url;
      await audio.play();
    } catch (error) {
      console.error("加载音乐失败:", error);
    }
  };

  // 切换播放/暂停状态
  const togglePlayPause = (playIcon, url) => {
    if (!playIcon) {
      console.error("传递的 playIcon 元素未找到");
      return;
    }

    if (currentUrl !== url) {
      // 播放不同的音乐
      updateIconClass(currentPlayingIcon, false);
      currentUrl = url;
      loadMusic(url);
      updateIconClass(playIcon, true);
      currentPlayingIcon = playIcon;
    } else if (audio.paused) {
      // 继续播放
      audio.play();
      updateIconClass(playIcon, true);
    } else {
      // 暂停播放
      audio.pause();
      updateIconClass(playIcon, false);
    }
  };

  // 更新图标样式
  const updateIconClass = (icon, isPlaying) => {
    if (!icon) return;
    icon.classList.toggle("icon-bofang", !isPlaying);
    icon.classList.toggle("icon-zanting1", isPlaying);
    icon.classList.toggle("playing-pink", isPlaying);
  };

  // 音乐结束时恢复图标
  audio.addEventListener("ended", () =>
    updateIconClass(currentPlayingIcon, false)
  );

  return { togglePlayPause };
})();

// 表格管理模块
const tableManager = (() => {
  const table = document.querySelector("#musicTable");

  // 创建表格行
  const createRow = (item, msg) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>
        <div class="con">
          <div class="txt title">${item.title}</div>
        </div>
      </td>
      <td>
        <div class="con">
          <div class="txt singer">${item.singer}</div>
        </div>
      </td>
      <td>
        <div class="button">
          <i class="iconfont icon-bofang"></i>
          <i class="iconfont icon-iconfront-"></i>
          <i class="iconfont icon-download"></i>
          <div class="circular-progress-container">
            <svg class="circular-progress" viewBox="0 0 24 24">
              <circle class="circular-bg" cx="12" cy="12" r="10"/>
              <circle class="circular-bar" cx="12" cy="12" r="10"/>
            </svg>
            <svg class="checkmark" viewBox="0 0 24 24">
              <polyline points="20,6 9,17 4,12"/>
            </svg>
          </div>
        </div>
      </td>`;

    const playIcon = row.querySelector(".icon-bofang");
    const downloadButton = row.querySelector(".icon-download");
    const circularProgressContainer = row.querySelector(
      ".circular-progress-container"
    );
    const circularBar = row.querySelector(".circular-bar");
    const checkmark = row.querySelector(".checkmark");

    if (playIcon) {
      playIcon.addEventListener("click", () => {
        audioController.togglePlayPause(
          playIcon,
          `${baseUrl}?msg=${msg}&type=json&n=${item.n}`
        );
      });
    }

    downloadButton.addEventListener("click", async () => {
      circularProgressContainer.style.display = "block"; // 显示进度条容器

      const url = `${baseUrl}?msg=${msg}&type=json&n=${item.n}`;
      try {
        const data = await fetchJson(url);
        if (!data.music_url) {
          throw new Error("音乐 URL 不存在");
        }

        const musicResponse = await fetch(data.music_url);
        if (!musicResponse.ok) {
          throw new Error("无法下载音乐文件");
        }

        const contentLength = +musicResponse.headers.get("Content-Length");
        const reader = musicResponse.body.getReader();

        let receivedLength = 0;
        const chunks = [];

        const updateProgress = (progress) => {
          circularBar.style.strokeDasharray = `${progress}, 100`;
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          chunks.push(value);
          receivedLength += value.length;

          const progress = (receivedLength / contentLength) * 100;
          updateProgress(progress);
        }

        const blob = new Blob(chunks);
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${item.title} - ${item.singer}.flac`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);

        checkmark.classList.add("active");
      } catch (error) {
        console.error("下载失败:", error);
      } finally {
        circularProgressContainer.style.display = "block";
      }
    });

    return row;
  };

  // 填充表格
  const populateTable = (data, msg) => {
    table.innerHTML = `
      <colgroup>
        <col span="1" class="col1" />
        <col span="1" class="col2" />
        <col span="1" class="col3" />
      </colgroup>
      <tr>
        <th>歌曲</th>
        <th>歌手</th>
        <th>操作</th>
      </tr>`;

    data.forEach((item) => table.appendChild(createRow(item, msg)));
  };

  return { populateTable };
})();

// 搜索功能
const searchHandler = async () => {
  const input = document.querySelector(".input");
  const msg = input.value.trim();

  if (msg) {
    try {
      const result = await fetchJson(`${baseUrl}?msg=${msg}&type=json`);
      tableManager.populateTable(result.data, msg);
    } catch (error) {
      console.error("获取音乐失败:", error);
    }
  } else {
    alert("请输入搜索内容");
  }
};

// 初始化搜索按钮事件
document.querySelector(".search").addEventListener("click", searchHandler);
