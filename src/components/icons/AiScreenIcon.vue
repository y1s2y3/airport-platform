<template>
  <!-- 与 Element Plus Monitor 同坐标系/线宽：viewBox 1024，填充线框约 64 -->
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" aria-hidden="true">
    <!-- 屏幕外框 + 底座（对齐 Monitor） -->
    <path
      fill="currentColor"
      d="M544 768v128h192a32 32 0 1 1 0 64H288a32 32 0 1 1 0-64h192V768H192A128 128 0 0 1 64 640V256a128 128 0 0 1 128-128h640a128 128 0 0 1 128 128v384a128 128 0 0 1-128 128zM192 192a64 64 0 0 0-64 64v384a64 64 0 0 0 64 64h640a64 64 0 0 0 64-64V256a64 64 0 0 0-64-64z"
    />
    <!-- 屏内 AI（字重与线框视觉接近） -->
    <text
      x="512"
      y="470"
      text-anchor="middle"
      dominant-baseline="middle"
      fill="currentColor"
      font-size="300"
      font-weight="700"
      font-style="normal"
      font-family="system-ui, -apple-system, 'Segoe UI', sans-serif"
      letter-spacing="-16"
    >AI</text>
  </svg>
</template>
