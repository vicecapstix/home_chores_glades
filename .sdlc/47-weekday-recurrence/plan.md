# Plan — #47
Files: src/utils.js (helpers, dueStatus, taskPoints), src/tasks.js (addTask/editTask/saveTask/checkTaskResets), src/ui.js (templates), src/render.js (tag), src/index.html + style.css (chips), src/main.js (toggle), tests/weekdays.test.js. Steps: helpers+tests -> UI -> npm test/build. Rollback: revert PR; tasks with freq weekdays would need editing to another freq.
