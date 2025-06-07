"use client"
import React, { useRef, useState } from 'react'
import { useForm } from 'react-hook-form';
import { uploadBytesResumable, getDownloadURL, ref as strRef } from 'firebase/storage';
import { getFirestore, collection, addDoc} from "firebase/firestore";
import app, { storage } from '../firebase';
import styles from "../index.module.css";
import { useRouter } from "next/navigation";
import { useSelector } from 'react-redux';
import { RiDragDropLine } from "react-icons/ri";
import { BiSolidPhotoAlbum } from "react-icons/bi";

const review = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const [image, setImage] = useState([]);
  const { push } = useRouter();
  const [uploadFile, setUploadFile] = useState([]);
  const [images, setImages] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const db2 = getFirestore(app);
  const { currentUser } = useSelector(state => state.user)



  const onClickUpLoadButton = async (data) => {  
   await addDoc(collection(db2, "reviews"),
      {
        "name": currentUser.name ?? "익명",
        "description": data.description,
        "url": image,
        "title": data.title,
        "phoneNumber": currentUser.phoneNumber ?? "0",
        "userKey": currentUser.uid ?? "",
        "createdDate": new Date(),
        "NumOfLikes": [],
      })

      // push(`/ta?val=account`);
      location.reload();
  }


  async function uploadUrl() {
    uploadFile.map((file) => {
      const metadata = { contentType: file.type };
      const storageRef = strRef(storage, `test/${file.name}`);
      const uploadTask = uploadBytesResumable(storageRef, file, metadata);
      uploadTask.on(
        "state_changed",
        (snapshot) => {
            setPercentage(Math.round(process));
            switch (snapshot.state) {
                case 'paused':
                    break;
                case 'running':
                    break;
                default:
                    break;
            }
        },
        (error) => {
            // A full list of error codes is available at
            // https://firebase.google.com/docs/storage/web/handle-errors
            switch (error.code) {
                case 'storage/unauthorized':
                    // User doesn't have permission to access the object
                    break;
                case 'storage/canceled':
                    // User canceled the upload
                    break;
                case 'storage/unknown':
                    // Unknown error occurred, inspect error.serverResponse
                    break;
                default:
                    break;
            }
        },
       () => {
        getDownloadURL(uploadTask.snapshot.ref)
        .then((downloadURLs) => {
          setImage(image => [...image, downloadURLs]);
        })
   
     })
    })
    return image
  }
  
    function selectFiles(){
      fileInputRef.current.click()
    }

  
    function onFileSelect(event){   //보여주고 handle로 넘어가게 한다.
      const files = event.target.files
      const uploadFile = Array.from(files)
      setUploadFile((prevImages) => 
        prevImages.concat(uploadFile)
      )
      if (files.length === 0) return;
      for (let i = 0; i < files.length; i++) {
        if (files[i].type.split('/')[0] !== 'image') continue;
        if (!images.some((e)=> e.name === files[i].name)) {
          setImages((prevImages) => [
            ...prevImages, 
           {
            name: files[i].name,
            url: URL.createObjectURL(files[i])
           },
        ]);
      }
      }
    }
  
    function deleteImage(index) {
      setImages((prevImages) => 
        prevImages.filter((_, i)=> i !== index)
      )
      setUploadFile((prevImages) => 
        prevImages.filter((_, i)=> i !== index)
      )
    }
  
    function onDragOver(event) {
      event.preventDefault();
      setIsDragging(true);
      event.dataTransfer.dropEffect = "copy";
    }
  
    function onDragLeave(event) {
      event.preventDefault();
      setIsDragging(false);
    }
  
    function onDrop(event) {
      event.preventDefault();
      setIsDragging(false);
      const files = event.dataTransfer.files;
      for (let i = 0; i < files.length; i++) {
        if (files[i].type.split('/')[0] !== 'image') continue;
        if (!images.some((e)=> e.name === files[i].name)) {
          setImages((prevImages) => [
            ...prevImages,
           {
            name: files[i].name,
            url: URL.createObjectURL(files[i])
           },
        ]);
      }
      }
    }
  
    async function uploadImage(){
      uploadUrl()
      alert("이미지가 업로드 되었습니다.")
    }


  return (
    <div className="flex items-center justify-start p-12">
    <div className="mx-auto w-full max-w-[550px] bg-white">
       <div className='font-medium text-lg' style={{ textAlign: 'center' }}>
      <h3>글쓰기</h3>
     </div>   
    {/* <div className='w-full flex justify-center items-center '>
    <div className={styles.card}>
      <div className='mt-5' />
      <div className={styles.dragArea} onClick={selectFiles} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
        {isDragging ? (
          <RiDragDropLine size={50} />
        ) : (
         <>
          <RiDragDropLine size={50}/>  {" "} 
         <span className='select' role='button'>
         <BiSolidPhotoAlbum size={50} />
         </span>
        </>
        )}
        <input name='file' type='file' className='file' multiple ref={fileInputRef} onChange={onFileSelect}></input>
        </div>
        <div className={styles.container}>
          {images.map((images, index) => (
              <div className={styles.image} key={index}>
              <span className={styles.delete} onClick={() => deleteImage(index)}>&times;</span>
            <img src={images.url} alt={images.name} />
          </div>
          ))}
         </div>
        <button className='w-full px-8 py-4 rounded-lg font-medium bg-orange-600 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-gray-400 focus:bg-white'
         onClick={uploadImage}>
          이미지업로드
        </button>
       
    </div>
    
    </div> */}
        <div className='mt-5'/>
        <form className='mx-auto max-w-sm' onSubmit={handleSubmit(onClickUpLoadButton)}>
             <input
                  className="w-full px-8 py-4 rounded-lg font-medium bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-gray-400 focus:bg-white"
                  type="title" 
                  name="title"
                  placeholder="제목"
                  {...register("title")}
                />
             <div className='mt-5'/>
            
              <textarea
                    className="w-full px-8 py-4 rounded-lg font-medium bg-gray-100 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-gray-400 focus:bg-white"
                    placeholder="장문 입력"
                    name="description"
                    rows="5" 
                    cols="16"
                    {...register("description")}
                />     
              <div className='mt-5'/>  

            <div>
                <button
                    type="submit"
                    className="w-full px-8 py-4 rounded-lg font-medium bg-amber-300 border border-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-gray-400 focus:bg-white">
                    등록
                </button>
            </div>
        </form>
    </div>
</div>
  )
}

export default review
