import { updateActivity, getActivityLogs } from './storage.js';

export function log(action, meta){
  updateActivity(action, meta);
}

export function clear(){
  localStorage.setItem('activityLogs', JSON.stringify([]));
}

export function get(){
  return getActivityLogs();
}
