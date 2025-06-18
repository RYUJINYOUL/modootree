"use client"
import React, { useState, useCallback } from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';

const ScrollableTabsButtonForce =() => {
  const [value, setValue] = useState(0);

  const handleChange = useCallback((event, newValue) => {
    console.log(newValue)
    setValue(newValue);
  }, []);

  const slideLeft = () => {
    let slider = document.getElementById('slider')
    slider.scrollLeft = slider.scrollLeft - 500
  }

  const slideright = () => {
    let slider = document.getElementById('slider')
    slider.scrollLeft = slider.scrollLeft + 500
    console.log(slider);
  }


  return (
    <div>
      <Tabs id='slider'
        value={value}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons={false}
        // allowScrollButtonsMobile
        aria-label="scrollable force tabs example"
      >
        <Tab label="Item One" onClick={slideright} />
        <Tab label="Item Two" onClick={slideright}/>
        <Tab label="Item Three" />
        <Tab label="Item Four" />
        <Tab label="Item Five" />
        <Tab label="Item Six" />
        <Tab label="Item Seven" />
      </Tabs>
    </div>
  );
}

export default ScrollableTabsButtonForce