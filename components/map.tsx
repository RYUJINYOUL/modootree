"use client"

import React, { useEffect } from "react"
import { Loader } from '@googlemaps/js-api-loader'

export default function Map() {

    const mapRef = React.useRef<HTMLDivElement>(null)

    useEffect(() => {

        const initMap = async () => {
           const loader = new Loader({
                apiKey: process.env.NEXT_PUBLIC_GOOGLe_KEY as string,
                version: 'weekly'
           })

           const { Map } = await loader.importLibrary('maps');

           const { Marker } = await loader.importLibrary('marker') as google.maps.MarkerLibrary

           const position = {
            lat: 37.341279, 
            lng: 126.806572
           }

           const mapOptions: google.maps.MapOptions = {
               center: position,
               zoom: 17,
               mapTypeId: 'hybrid',
               streetViewControl:false,
               fullscreenControl:false,
               gestureHandling:'cooperative',
               mapId: "MY_NEXTJS_MAPID",
           }


           const map = new Map(mapRef.current as HTMLDivElement, mapOptions);

           const marker = new Marker({
              map: map,
              position: position
           })
        }

        initMap()
    }, [])

    return (
       <div className="rounded-md" style={{ height: '100%'}} ref={mapRef} />
    )
}