// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title Database — a minimal on-chain document database
/// @notice Collections hold JSON documents with auto-incrementing IDs.
///         One contract is the whole database: create / get / update / remove / list.
contract Database {
    struct Document {
        uint256 id;
        string data; // JSON payload
        uint256 createdAt;
        uint256 updatedAt;
        bool exists;
    }

    struct CollectionMeta {
        bool exists;
        uint256 nextId; // auto-increment counter, first document gets id 1
        uint256 documentCount; // live (non-deleted) documents
        uint256[] ids; // every id ever issued; deleted ones are skipped on read
    }

    address public owner;
    string[] private collectionNames;
    mapping(string => CollectionMeta) private collections;
    mapping(string => mapping(uint256 => Document)) private documents;

    event CollectionCreated(string collection);
    event DocumentCreated(string collection, uint256 indexed id);
    event DocumentUpdated(string collection, uint256 indexed id);
    event DocumentDeleted(string collection, uint256 indexed id);

    modifier onlyOwner() {
        require(msg.sender == owner, "Database: caller is not the owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    /// @notice Register a collection. Also happens implicitly on first create().
    function createCollection(string memory collection) public onlyOwner {
        require(bytes(collection).length > 0, "Database: empty collection name");
        require(!collections[collection].exists, "Database: collection exists");
        collections[collection].exists = true;
        collections[collection].nextId = 1;
        collectionNames.push(collection);
        emit CollectionCreated(collection);
    }

    /// @notice Store a JSON document. Returns its auto-incremented id.
    function create(string memory collection, string memory data)
        public
        onlyOwner
        returns (uint256)
    {
        if (!collections[collection].exists) {
            createCollection(collection);
        }
        CollectionMeta storage meta = collections[collection];
        uint256 id = meta.nextId;
        meta.nextId = id + 1;
        documents[collection][id] = Document({
            id: id,
            data: data,
            createdAt: block.timestamp,
            updatedAt: block.timestamp,
            exists: true
        });
        meta.ids.push(id);
        meta.documentCount += 1;
        emit DocumentCreated(collection, id);
        return id;
    }

    /// @notice Fetch a single document.
    function get(string memory collection, uint256 id)
        public
        view
        returns (Document memory)
    {
        require(documents[collection][id].exists, "Database: document not found");
        return documents[collection][id];
    }

    /// @notice Replace a document's JSON payload.
    function update(string memory collection, uint256 id, string memory data)
        public
        onlyOwner
    {
        require(documents[collection][id].exists, "Database: document not found");
        documents[collection][id].data = data;
        documents[collection][id].updatedAt = block.timestamp;
        emit DocumentUpdated(collection, id);
    }

    /// @notice Delete a document. (`delete` is a reserved word in Solidity.)
    function remove(string memory collection, uint256 id) public onlyOwner {
        require(documents[collection][id].exists, "Database: document not found");
        delete documents[collection][id];
        collections[collection].documentCount -= 1;
        emit DocumentDeleted(collection, id);
    }

    /// @notice All live documents in a collection, in insertion order.
    function list(string memory collection)
        public
        view
        returns (Document[] memory)
    {
        CollectionMeta storage meta = collections[collection];
        Document[] memory result = new Document[](meta.documentCount);
        uint256 j = 0;
        for (uint256 i = 0; i < meta.ids.length; i++) {
            Document storage doc = documents[collection][meta.ids[i]];
            if (doc.exists) {
                result[j] = doc;
                j++;
            }
        }
        return result;
    }

    /// @notice Every collection name with its live document count.
    function listCollections()
        public
        view
        returns (string[] memory names, uint256[] memory counts)
    {
        names = collectionNames;
        counts = new uint256[](collectionNames.length);
        for (uint256 i = 0; i < collectionNames.length; i++) {
            counts[i] = collections[collectionNames[i]].documentCount;
        }
    }

    /// @notice Total live documents across all collections.
    function totalDocuments() public view returns (uint256 total) {
        for (uint256 i = 0; i < collectionNames.length; i++) {
            total += collections[collectionNames[i]].documentCount;
        }
    }
}
