import React, { FC, useEffect, useRef } from 'react'
import Peer from 'simple-peer'
interface VideoInterface{
    socketId:string,
    userSid:string,
    mediaStream:MediaStream,
    name:string,
    isMuted:boolean,
    isPaused:boolean

}
const Video:FC<VideoInterface>=({socketId,userSid,mediaStream})=> {
    const videoRef = useRef<HTMLVideoElement|null>(null)
    useEffect(()=>{
        if (!videoRef.current) return;
        videoRef.current.srcObject = new MediaStream(mediaStream);
        
        if (socketId === userSid) videoRef.current.muted = true;
        videoRef.current.play();
    },[mediaStream])
  return (
    <video autoPlay ref={videoRef}></video>
  )
}

export default Video