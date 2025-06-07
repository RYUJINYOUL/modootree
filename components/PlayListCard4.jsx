"use client";
import Image from "next/image";
import React from "react";
import { getRandomElementFromArray } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { MdMoreVert } from "react-icons/md";
import { FiPlay } from "react-icons/fi";
import IconButton from "./elements/IconButton";
import Link from 'next/link'


const PlayListCard4 = ({ playlist = [], collection = "" } = {}) => {

  const { push } = useRouter();
  const { 
    name, description, url, 
    title, address, phoneNumber, userKey, category,
    createdDate, NumOfLikes, geoFirePoint, id
  } 
  = playlist ?? [];

  const onClickCard = (id) => {
    push(`/playlist?list=${id}&col=${collection}`);
    // push(`/test/?name=${id}collection=${collection}`);
  };
  

  return (
    <article className="h-[350px] cursor-pointer group">
    <section onClick={onClickCard} className=" relative h-[350px] ">
      <Image
        src={
          playlist ||
          "https://www.redwoodhikes.com/JedSmith/JedSmith1.jpeg"
        }
        fill={true}
        alt="thumbnail"
        className="object-contain rounded-md border-2 border-black-200 border-opacity-25"
      />
      <div className="hidden relative group-hover:block bg-black bg-opacity-20 rounded-md from-[rgba(0,0,0,0.7)] top-0 w-full h-[350px] ">
      </div>
    </section>

  </article>
);
};

export default PlayListCard4;
