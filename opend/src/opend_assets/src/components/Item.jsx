import React, { useEffect, useState } from "react";
import logo from "../../assets/logo.png";
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "../../../declarations/nft";
import { Principal } from "@dfinity/principal";
import Button from "./Button";
import { opend } from "../../../declarations/opend";
import { nft } from "../../../declarations/nft";
import CURRENT_USER_ID from "../index";
import PriceLabel from "./PriceLabel";
import { idlFactory as tokenIdlFactory } from "../../../declarations/token";
function Item(props) {
  const [name, setName] = useState();
  const [owner, setOwner] = useState();
  const [image, setImage] = useState();
  const [button, setButton] = useState();
  const [priceInput, setPriceInput] = useState();
  const [priceLabel, setPriceLabel] = useState();
  const [loaderHidden, setLoaderHidden] = useState(true);
  const [blur,setBlur] = useState();
  const [sellStatus,setSellStatus] = useState("");
  const [shouldDisplay,setShouldDisplay] = useState(true);

  const id = props.id;
  const localHost = "http://localhost:8080/";
  const agent = new HttpAgent({ host: localHost });
  agent.fetchRootKey(); //remove when deploy
  let NFTActor;
  useEffect(() => {
    loadNFT();
  }, []);
  async function loadNFT() {
    NFTActor = await Actor.createActor(idlFactory, {
      agent,
      canisterId: id,
    });
    const NFTname = await NFTActor.getName();
    const NFTowner = await NFTActor.getOwner();
    const NFTimg = await NFTActor.getImage();
    const imgContent = new Uint8Array(NFTimg);
    const imgURL = URL.createObjectURL(
      new Blob([imgContent.buffer], { type: "image.png" })
    );
    setName(NFTname);
    setOwner(NFTowner.toText());
    setImage(imgURL);
    const NFTIsListed = await opend.isListed(props.id);
    if(props.role=="collection"){
      if(NFTIsListed){
        setOwner("OpenD");
        setBlur({filter :"blur(4px)"});
        setSellStatus(" Listed");
      }else{
        setButton(<Button handleClick={handleSell} text={"Sell"} />);
      }
    }else if(props.role == "discover"){
      const originalOwner = await opend.getOriginalOwner(props.id);
      if (originalOwner.toText() != CURRENT_USER_ID.toText()){
        setButton(<Button handleClick={handleBuy} text={"Buy"} />);
      }
      const price = await opend.getListedNFTPrice(props.id);
      setPriceLabel(<PriceLabel sellPrice={price.toString()}/>);

    }

  }
  let price;
  function handleSell() {
    setPriceInput(
      <input
        placeholder="Price in PASTA"
        type="number"
        className="price-input"
        value={price}
        onChange={(e) => {
          price = e.target.value;
        }}
      />
    );
    setButton(<Button handleClick={sellItem} text={"Confirm"} />);
  }

  async function sellItem() {
    setBlur({filter :"blur(4px)"});
    setLoaderHidden(false);
    const listingResult = await opend.listItem(props.id, Number(price));
    console.log(listingResult);
    if (listingResult == "Success") {
      const openDId = await opend.getOpenDCanisterID();
      const transferResult = await NFTActor.transferOwnership(openDId);
      console.log(transferResult);
      if(transferResult=="Success"){
        setLoaderHidden(true);
        setButton();
        setPriceInput();
        setOwner("OpenD");
        setSellStatus(" Listed");
      }
    }
  }
  async function handleBuy(){
    setLoaderHidden(false);
    const tokenActor = await Actor.createActor(tokenIdlFactory,{
      agent,
      canisterId:Principal.fromText("rrkah-fqaaa-aaaaa-aaaaq-cai"),
    });
    const sellerId = await opend.getOriginalOwner(props.id);
    console.log(sellerId);
    const itemPrice = await opend.getListedNFTPrice(props.id);
    console.log(parseInt(itemPrice));
    const result= await tokenActor.transfer(sellerId,itemPrice);
    console.log(result);
    if(result=="Success"){
      const transferResult = await opend.completePurchase(props.id,sellerId,CURRENT_USER_ID);
      setLoaderHidden(true);
      setShouldDisplay(false);
    }
  }

  return (
    <div style={{display : shouldDisplay ? "inline" : "none"}} className="disGrid-item">
      <div className="disPaper-root disCard-root makeStyles-root-17 disPaper-elevation1 disPaper-rounded">
        <img
          className="disCardMedia-root makeStyles-image-19 disCardMedia-media disCardMedia-img"
          src={image}
          style={blur}
        />
        <div hidden={loaderHidden} className="lds-ellipsis">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <div className="disCardContent-root">
          {priceLabel}
          <h2 className="disTypography-root makeStyles-bodyText-24 disTypography-h5 disTypography-gutterBottom">
            {name}
            <span className="purple-text"> {sellStatus}</span>
          </h2>
          <p className="disTypography-root makeStyles-bodyText-24 disTypography-body2 disTypography-colorTextSecondary">
            Owner: {owner}
          </p>
          {priceInput}
          {button}
        </div>
      </div>
    </div>
  );
}

export default Item;
