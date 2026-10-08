import SegmentInspector from './SegmentInspector';
import {fadeEnvelope} from './segment-effects';
import {isTauri} from '@tauri-apps/api/core';
import EffectsInspector from './EffectsInspector';
import {useEffect,useRef,useState} from 'react';
import {createDocument,EditHistory,locate,segmentDuration,split,timelineDuration,validateDocument,type EditDocument} from './timeline';
import {loadEdit,saveEdit} from './editor-storage';
import {renderFrame} from './canvas-renderer';
import {exportEdit} from './editor-export';
import {packProject} from './project-package';

type Props={mediaId:string;name:string;url:string;duration:number;sourceBlob?:Blob};