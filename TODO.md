- [x] Fix Department Distribution SVG renderer in modules/charts.js only
  - [ ] Validate deptCounts (non-empty, valid department strings, numeric counts; ignore null/undefined/NaN)
  - [ ] Auto-scale Y-axis from 0 using integer tick values
  - [ ] Remove duplicated/odd tick labels
  - [ ] Render “No data available” placeholder when no valid department data
  - [ ] Adjust internal SVG layout so chart fills ~85% of card height and avoids excessive whitespace
  - [ ] Prevent clipping/stretching by using viewBox-safe coordinates and centered plot area
  - [ ] Add temporary console logs for: raw deptCounts + processed deptCounts (labels + counts)
  - [ ] Remove debug logs after verification


