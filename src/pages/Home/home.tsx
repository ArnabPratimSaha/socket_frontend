import React, { useState } from 'react'
import {useNavigate} from 'react-router-dom'
import {v4 as uuid} from 'uuid'
const Home=()=>{
    const navigate = useNavigate()
    const [val,setVal]=useState<string>(uuid());
    const [id,setId]=useState<string>(uuid());
    const [name,setName]=useState<string>("Guest");
    return(<div>
      <label >Room id</label>
      <input style={{width:'20rem'}} placeholder='enter room id' name='room' type={'text'} onChange={(e)=>setVal(e.target.value)} value={val}/><br/>
      <label >username</label>
      <input style={{width:'20rem'}} placeholder='enter user name' name='room' type={'text'} onChange={(e)=>setName(e.target.value)} value={name}/><br/>
      <button onClick={() => navigate(`/${val}/${id}/${name}`)}>Navigate</button>
    </div>)
  }
  

export default Home