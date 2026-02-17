import copy
import logging
import os

from dotenv import load_dotenv
from uvicorn.config import LOGGING_CONFIG

from app.app_factory import create_app
from app.config import settings
from app.services.log_collector import setup_logging


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

load_dotenv()
setup_logging()

if settings.SECRET_KEY == "dev-secret-key-change-in-production-use-openssl-rand-hex-32":
    logger.warning(
        "SECURITY WARNING: Using default insecure SECRET_KEY! "
        "Set SECRET_KEY env variable in production."
    )


app = create_app()


if __name__ == "__main__":
    import uvicorn

    log_config = copy.deepcopy(LOGGING_CONFIG)
    log_config["formatters"]["default"]["fmt"] = (
        "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
    log_config["formatters"]["access"]["fmt"] = (
        '%(asctime)s - %(name)s - %(levelname)s - %(client_addr)s - "%(request_line)s" %(status_code)s'
    )

    ssl_keyfile = "key.pem" if os.path.exists("key.pem") else None
    ssl_certfile = "cert.pem" if os.path.exists("cert.pem") else None
    use_https = os.getenv("USE_HTTPS", "false").lower() == "true"

    run_kwargs = {
        "app": "app.main:app",
        "host": "0.0.0.0",
        "port": 8000,
        "reload": True,
        "reload_excludes": [".git", "__pycache__", "node_modules"],
        "log_config": log_config,
    }

    if use_https and ssl_keyfile and ssl_certfile:
        logger.info("Starting with HTTPS (self-signed certificate)")
        logger.info("Access via: https://192.168.0.100:8000")
        logger.info("Note: Accept the security warning in your browser")
        uvicorn.run(
            **run_kwargs,
            ssl_keyfile=ssl_keyfile,
            ssl_certfile=ssl_certfile,
        )
    else:
        logger.info("Starting with HTTP (Default)")
        if use_https:
            logger.warning(
                "WARNING: HTTPS requested but certificates (key.pem/cert.pem) not found."
            )
        logger.info(
            "For mobile voice, generate cert: uv run python scripts/generate_cert.py"
        )
        logger.info("To enable HTTPS: ./scripts/dev.ps1 -Https")
        uvicorn.run(**run_kwargs)
