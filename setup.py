from setuptools import setup, find_packages

setup(
    name="bluesky-scheduler",
    version="1.0.0",
    packages=find_packages(),
    install_requires=[
        "atproto>=0.0.54",
        "APScheduler>=3.10.4",
        "click>=8.1.7",
        "python-dotenv>=1.0.0",
        "rich>=13.7.0",
    ],
    entry_points={
        "console_scripts": [
            "bluesky-scheduler=bluesky_scheduler.cli:cli",
        ],
    },
    python_requires=">=3.11",
)
