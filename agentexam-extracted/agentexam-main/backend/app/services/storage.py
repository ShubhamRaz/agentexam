import os
import aiofiles
from typing import BinaryIO
from fastapi import UploadFile

from app.core.config import settings

class StorageProvider:
    async def save(self, file: UploadFile, storage_key: str) -> str:
        raise NotImplementedError

    async def get(self, storage_key: str) -> str:
        raise NotImplementedError

    async def delete(self, storage_key: str) -> bool:
        raise NotImplementedError

    async def exists(self, storage_key: str) -> bool:
        raise NotImplementedError


class LocalStorageProvider(StorageProvider):
    def __init__(self, base_path: str):
        self.base_path = base_path
        os.makedirs(self.base_path, exist_ok=True)

    async def save(self, file: UploadFile, storage_key: str) -> str:
        full_path = os.path.join(self.base_path, storage_key)
        
        # Ensure directories exist
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        
        # Security: Prevent path traversal
        if not os.path.abspath(full_path).startswith(os.path.abspath(self.base_path)):
            raise ValueError("Invalid storage key")

        file.file.seek(0)
        async with aiofiles.open(full_path, 'wb') as out_file:
            while content := file.file.read(1024 * 1024):  # 1MB chunks
                await out_file.write(content)
                
        return storage_key

    async def get(self, storage_key: str) -> str:
        full_path = os.path.join(self.base_path, storage_key)
        if not os.path.abspath(full_path).startswith(os.path.abspath(self.base_path)):
            raise ValueError("Invalid storage key")
        return full_path

    async def delete(self, storage_key: str) -> bool:
        full_path = os.path.join(self.base_path, storage_key)
        if not os.path.abspath(full_path).startswith(os.path.abspath(self.base_path)):
            raise ValueError("Invalid storage key")
            
        if os.path.exists(full_path):
            os.remove(full_path)
            return True
        return False

    async def exists(self, storage_key: str) -> bool:
        full_path = os.path.join(self.base_path, storage_key)
        if not os.path.abspath(full_path).startswith(os.path.abspath(self.base_path)):
            return False
        return os.path.exists(full_path)


def get_storage_provider() -> StorageProvider:
    if settings.STORAGE_TYPE == "local":
        return LocalStorageProvider(base_path=settings.STORAGE_PATH)
    else:
        # Extend here for S3 etc.
        raise NotImplementedError(f"Storage type {settings.STORAGE_TYPE} is not implemented")
