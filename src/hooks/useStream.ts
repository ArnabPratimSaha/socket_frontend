import React, { useEffect, useState } from 'react'

const useStream=()=> {
    const [stream,setStream]=useState<MediaStream|'LOADING'>('LOADING');
    useEffect(()=>{
        // if(!navigator.mediaDevices)return;
        navigator.mediaDevices.getUserMedia({audio:true,video:true}).then((stream:MediaStream)=>{
            setStream(stream)
        }).catch(err=>{
            console.log(err);
            
        })
    },[navigator.mediaDevices])
    return [stream];
}

export default useStream