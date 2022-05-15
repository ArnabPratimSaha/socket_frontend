import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, useRoutes } from 'react-router-dom';
import  { Socket,io } from "socket.io-client";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './room.css';
import { TextField } from '@mui/material';
import Peer, { SimplePeerData } from 'simple-peer'
import useStream from '../../hooks/useStream';
import Video from './Video/Video';
import { FaBeer } from 'react-icons/fa';

interface ServerToClientEvents {
  hello: () => void;
  userJoin: (userId:string,socketId:string,name:string) => void;
  userLeft: (userId:string,socketId:string) => void;
  sendMessage:(uid:string, msg:string)=>void;
  sendFocus:(uid:string)=>void;
  sendBlur:(uid:string)=>void;
  roomInfo:(users: Array<{
    name: string,
    id: string,
    sid: string,
  }>)=>void;
  sendCallAccept:(callerSid:string,data:Peer.SignalData)=>void
  reciveCallAccept:(callerSid:string,data:Peer.SignalData)=>void

}

interface ClientToServerEvents {
  hello: () => void;
  roomJoin:(rid:string, uid:string, name:string)=>void;
  roomLeave:(uid:string, rid:string)=>void
  sendCall:(userSid:string,senderSid:string,data:Peer.SignalData)=>void
  reciveCall:(userSid:string,data:Peer.SignalData)=>void;
  message:(uid:string, rid:string, msg:string)=>void
  onFocus:(uid:string, rid:string)=>void
  onBlur:(uid:string, rid:string)=>void
}

interface InterServerEvents {
  ping: () => void;
}

// interface SocketData {
//   name: string;
//   age: number;
// }
export interface User {
  name: string,
  id: string,
  sid: string,
  isTyping: boolean,
  isMuted:boolean,
  isPaused:boolean
}
const Room = () => {
  const { rid, uid, name } = useParams();
  const [msg, setMsg] = useState<string>("");
  // const socket = ;
  const [roomInfo, setRoomInfo] = useState<Array<User>>([]);
  const navigate = useNavigate();
  const [msgArray, setMsgArray] = useState<Array<{ id: string, msg: string }>>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const divRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents>>(io(process.env.BACKEND||'https://socketbackendarnab.herokuapp.com/'));
  const [stream]=useStream();
  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io();
  const [src,setSrc]=useState<Array<{socketId:string,stream:MediaStream}>>([]);
  const peerRef=useRef<Array<{socketId:string,peer:Peer.Instance}>>([]);
  useEffect(() => {
    if(!rid||!uid||!name)return;
    
    socketRef.current.on('sendMessage', (uid, msg) => {
      console.log(msg);
      
      setMsgArray(s => {
        let newS = [...s];
        newS.push({ id: uid, msg });
        return newS;
      })
    })
    socketRef.current.on('sendFocus', (uid: string) => {
      setRoomInfo(room => {
        let r = [...room];
        r.forEach(u => {
          if (u.id === uid) u.isTyping = true;
        })
        return r;
      })
    })
    socketRef.current.on('sendBlur', (uid: string) => {
      setRoomInfo(room => {
        let r = [...room];
        r.forEach(u => {
          if (u.id === uid) u.isTyping = false;
        })
        return r;
      })
    });
    socketRef.current.on('userLeft',(userId:string,socketId:string)=>{
      setSrc(s=>s.filter(sr=>sr.socketId!==socketId));
    })
    return () => {
      socketRef.current.emit('roomLeave', uid, rid);
      socketRef.current.disconnect();
    }
  }, [])
  const reciverRef = useRef<Array<{socketId:string,peer:Peer.Instance}>>([]);
  useEffect(()=>{
    if(stream==='LOADING'||!rid||!uid||!name)return;
    console.log(stream);
    
    socketRef.current.emit('roomJoin',rid,uid,name);
    if(videoRef.current){
      videoRef.current.srcObject=stream;
      videoRef.current.muted=true;
      videoRef.current.play();
    }
    socketRef.current.on('userJoin',(userId:string,socketId:string,name:string)=>{
      // setRoomInfo(s=>[...s,{id:userId,sid:socketId,name,isTyping:false,isMuted:false,isPaused:false}])
    });
    socketRef.current.on("roomInfo", (users: Array<{
      name: string,
      id: string,
      sid: string,
    }>) => {
      setRoomInfo(users.map(u=>{return {id:u.id,isMuted:false,isPaused:false,isTyping:false,name:u.name,sid:u.sid}}))
      users.forEach(u=>{
        // if(peerRef.current.find(p=>p.socketId===u.sid))return;
        if(u.sid===socketRef.current.id)return;
        toast(`sending 1 to ${u.sid}`);
        const peer=createPeer(u.sid,socketRef.current.id,stream);
        peerRef.current.push({socketId:u.sid,peer});
      })
    })
    socketRef.current.on('sendCallAccept',(callerSid:string,data:Peer.SignalData)=>{      
      const peer=addPeer(callerSid,data,stream);
      reciverRef.current.push({peer,socketId:callerSid})
    })
    socketRef.current.on('reciveCallAccept',(callerSid:string,data:Peer.SignalData)=>{
      peerRef.current.forEach(p=>{
        if(p.socketId===callerSid){
          p.peer.signal(data)
        }
      });
    })
  },[stream])
  const createPeer=(userSid:string,senderSid:string,stream:MediaStream ):Peer.Instance=>{
    const peer=new Peer({initiator:true,trickle:false,stream})
    peer.on('signal',(data:Peer.SignalData)=>{
      socketRef.current.emit('sendCall',userSid,senderSid,data);
    })
    return peer;
  }
  const addPeer=(userSid:string,data:Peer.SignalData,stream:MediaStream ):Peer.Instance=>{
    const peer=new Peer({initiator:false,trickle:false})
    peer.on('signal',(data:Peer.SignalData)=>{
      socketRef.current.emit('reciveCall',userSid,data);
    })
    peer.on('stream',async(stm)=>{
      toast(`stream from ${userSid}`);
      console.log(stm);
      if(divRef.current){
        const ele=document.createElement('video');
        ele.srcObject=new MediaStream(stm);
        ele.onloadedmetadata=((e)=>{
          ele.play();
        })
        divRef.current.appendChild(ele);
      }
      setSrc(s=>[...s,{socketId:userSid,stream:stm}])
    })
    peer.signal(data);
    return peer;
  }
  const handleClick = () => {
    try {
      if (!uid||!rid) return;
      socketRef.current.emit('roomLeave', uid, rid);
      navigate('/');
    } catch (error) {
      console.log(error);
    }
  }
  const handleMessageSent: React.FormEventHandler<HTMLFormElement> = (e) => {
    e.preventDefault();
    if (!uid||!rid) return;
    if (!msg.length) return;
    socketRef.current.emit('message', uid, rid, msg);
    setMsg("");
  }
  const getUser = useCallback((uid: string) => {
    let user = roomInfo.filter(u => u.id === uid);
    if (user.length) return user[0];
    return undefined;
  }, [roomInfo])
  const handleInputFocus = () => {
    if (!uid||!rid) return;
    socketRef.current.emit("onFocus", uid, rid)
  }
  const handleInputBlur = () => {
    if (!uid||!rid) return;
    socketRef.current.emit("onBlur", uid, rid)
  }
  return (
    <div>
      <ToastContainer />
      <button onClick={handleClick}>Home</button>
      <p>Room id :{rid}</p>
      <p>User id :{uid}</p>
      <div className="dashboard">
        <div className="message">
          <div className="message-read">
            Messages
            {msgArray.map((m, i) => <div key={i} className={`msg ${i % 2 === 0 && 'even'}`}>
              <p>{m.msg}</p>
              <span>sent by {getUser(m.id)?.name}</span>
            </div>)}
          </div>
          <div className="message-write">
            <form onSubmit={handleMessageSent}>
              <TextField multiline className='message-box' title='message' value={msg} onChange={e => setMsg(e.target.value)} onFocus={handleInputFocus} onBlur={handleInputBlur}></TextField>

              <button>Sent</button>
            </form>
          </div>
        </div>
        <div className="users">
          {roomInfo.map(u => <div key={u.id}>
            <span >{u.name}</span>
            {u.isTyping && <span>typing</span>}
          </div>)}
        </div>
      </div>
      {/* .stream-control-button */}
      <div className="video-div" ref={divRef} >
        <video ref={videoRef}></video>
        {/* <p id='test'></p>
        {src.map((p,i)=>{
          const user=roomInfo.find(r=>r.sid===p.socketId);
          return <Video isMuted={false} isPaused={false} name={user?.id||'unknow_user'} key={i} socketId={p.socketId} userSid={socketRef.current.id} mediaStream={p.stream}></Video>})} */}
      </div>
    </div>
  )
}

export default Room