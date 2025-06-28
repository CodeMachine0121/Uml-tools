我需要一個可以手動繪製 uml 圖的平台, 以下會列出幾項需求

## Dev Env
1. 使用 `bun` 進行打包
2. 框架為 `svelte`
3. 須符合 clean archetecture, clean code

## User Story
- 畫面的左邊會有個 toolbox,  使用者應該要能夠從裡面選取 對應的東西（如介面, 類別, 依賴箭頭, 實做箭頭... 等等）出來繪製
- 選取完畢後使用者要可以透過滑鼠拉選的方始開始繪製
- 使用者可以按兩下滑鼠 來新增 text input 
- 接著需要有個按鈕 輸出對應的 mermaid, 同時也需要能夠反向轉換, 使用者 import  mermaid 產生對應的圖
