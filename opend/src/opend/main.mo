import Principal "mo:base/Principal";
import Cycles "mo:base/ExperimentalCycles";
import HashMap "mo:base/HashMap";
import List "mo:base/List";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Iter "mo:base/Iter";
import NFTActorClass "../nft/nft";

actor OpenD {
    private type Listing = {
        itemOwner:Principal;
        itemPrice:Nat;
    };

    var mapOfNFTs = HashMap.HashMap<Principal,NFTActorClass.NFT>(1,Principal.equal,Principal.hash);
    var mapOfOwners = HashMap.HashMap<Principal,List.List<Principal>>(1,Principal.equal,Principal.hash);
    var mapOfListing = HashMap.HashMap<Principal,Listing>(1,Principal.equal,Principal.hash);

    public shared(msg) func mint(name : Text,imgData:[Nat8]):async Principal{
        let owner : Principal = msg.caller;
        Cycles.add(100_500_000_000);
        let newNFT = await NFTActorClass.NFT(name,owner,imgData);
        let newNFTPrincipal = await newNFT.getCanisterId();
        mapOfNFTs.put(newNFTPrincipal,newNFT);
        addToOwnershipMap(owner,newNFTPrincipal);
        return newNFTPrincipal;
    };

    private func addToOwnershipMap(owner:Principal,nftId:Principal){
        var ownedNFTs : List.List<Principal> = switch (mapOfOwners.get(owner)){
            case null List.nil<Principal>();
            case (?result) result;
        };
        ownedNFTs := List.push(nftId,ownedNFTs);
        mapOfOwners.put(owner,ownedNFTs);
    };

    public query func getOwnedNFTs(user:Principal) : async [Principal]{
        var userNFTs : List.List<Principal> = switch (mapOfOwners.get(user)){
            case null List.nil<Principal>();
            case (?result) result;
        };
        return List.toArray(userNFTs);
    };
    public query func getListedNFTs():async [Principal]{
        let ids = Iter.toArray(mapOfListing.keys());
        return ids;
    };

    public shared(msg) func listItem(id:Principal,price:Nat) :async Text{
        var item : NFTActorClass.NFT = switch (mapOfNFTs.get(id)){
            case null return "NFT does not exist.";
            case (?result) result;
        };
        let owner = await item.getOwner();
        if (Principal.equal(owner,msg.caller)){
            let newListing :Listing ={
                itemOwner = owner;
                itemPrice = price;
            };
            mapOfListing.put(id,newListing);
            return "Success"
        }else{
            return "You don't own the NFT."
        };
    };
    public query func getOpenDCanisterID():async Principal{
        return Principal.fromActor(OpenD);
    };
    public query func isListed(id:Principal):async Bool{
        if(mapOfListing.get(id) == null){
            return false;
        }else{
            return true;
        }
    };
    public query func getOriginalOwner(id:Principal):async Principal{
        var listing : Listing = switch (mapOfListing.get(id)){
            case null return Principal.fromText("");
            case (?result) result;
        };
        return listing.itemOwner;
    };
    public query func getListedNFTPrice(id : Principal) :async Nat {
        var listing : Listing = switch (mapOfListing.get(id)){
            case null return 0;
            case (?result) result;
        };
        return listing.itemPrice;
    };
    public shared(msg) func completePurchase(id:Principal,ownerId:Principal,newOwnerId:Principal): async Text{
        var purchaseNFT : NFTActorClass.NFT = switch(mapOfNFTs.get(id)){
            case null return "NFT does not exist";
            case (?result) result;
        };
        let transferResult = await purchaseNFT.transferOwnership(newOwnerId);
        if (transferResult=="Success"){
            mapOfListing.delete(id);
            var ownedNFTs : List.List<Principal> = switch(mapOfOwners.get(ownerId)){
                case null List.nil<Principal>();
                case (?result) result;
            };
            ownedNFTs := List.filter(ownedNFTs,func (listItemId :Principal) : Bool{
                return listItemId != id;
            });
            addToOwnershipMap(newOwnerId,id);
            return "Success"
        }else{
            return transferResult;
        }
        
    };

};