import {convertFileSrc,invoke,isTauri} from '@tauri-apps/api/core';
import {useEffect,useState} from 'react';
import TimelineEditor from './TimelineEditor';
type NativeRecording={id:string;path:string;duration:number;createdAt:number};